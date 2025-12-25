#nullable disable

using GenomiX.Infrastructure.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.VisualStudio.Web.CodeGenerators.Mvc.Templates.BlazorIdentity.Pages.Manage;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Text;
using System.Text.Encodings.Web;

namespace GenomiX.Areas.Identity.Pages.Account
{
    [AllowAnonymous]
    public class ExternalLoginModel : PageModel
    {
        private readonly SignInManager<GenUser> _signInManager;
        private readonly UserManager<GenUser> _userManager;
        private readonly IUserStore<GenUser> _userStore;
        private readonly IUserEmailStore<GenUser> _emailStore;
        private readonly IEmailSender _emailSender;
        private readonly ILogger<ExternalLoginModel> _logger;

        public ExternalLoginModel(
            SignInManager<GenUser> signInManager,
            UserManager<GenUser> userManager,
            IUserStore<GenUser> userStore,
            ILogger<ExternalLoginModel> logger,
            IEmailSender emailSender)
        {
            _signInManager = signInManager;
            _userManager = userManager;
            _userStore = userStore;
            _emailStore = GetEmailStore();
            _logger = logger;
            _emailSender = emailSender;
        }

        [BindProperty]
        public InputModel Input { get; set; }

        public string ProviderDisplayName { get; set; }

        public string ReturnUrl { get; set; }

        [TempData]
        public string ErrorMessage { get; set; }


        public class InputModel
        { 
            [Required]
            [EmailAddress]
            public string Email { get; set; }

            [Required, StringLength(60, MinimumLength = 2)]
            public string FirstName { get; set; }

            [Required, StringLength(60, MinimumLength = 2)]
            public string LastName { get; set; }
        }
        
        public IActionResult OnGet() => RedirectToPage("./Login");

        public IActionResult OnPost(string provider, string returnUrl = null)
        {
            var redirectUrl = Url.Page("./ExternalLogin", 
                pageHandler: "Callback", 
                values: new { returnUrl });

            var properties = _signInManager
                .ConfigureExternalAuthenticationProperties(provider, redirectUrl);

            return new ChallengeResult(provider, properties);
        }

        public async Task<IActionResult> OnGetCallbackAsync(string returnUrl = null, string remoteError = null)
        {
            returnUrl = returnUrl ?? Url.Content("~/");
            if (remoteError != null)
            {
                ErrorMessage = $"Error from external provider: {remoteError}";
                return RedirectToPage("./Login", new { ReturnUrl = returnUrl });
            }
            var info = await _signInManager.GetExternalLoginInfoAsync();
            if (info == null)
            {
                ErrorMessage = "Error loading external login information.";
                return RedirectToPage("./Login", new { ReturnUrl = returnUrl });
            }

            var result = await _signInManager.ExternalLoginSignInAsync(info.LoginProvider, info.ProviderKey, isPersistent: false, bypassTwoFactor: true);
            if (result.Succeeded)
            {
                _logger.LogInformation("{Name} logged in with {LoginProvider} provider.", info.Principal.Identity.Name, info.LoginProvider);
                return LocalRedirect(returnUrl);
            }
            if (result.IsLockedOut)
            {
                return RedirectToPage("./Lockout");
            }
            else
            {
                ReturnUrl = returnUrl;
                ProviderDisplayName = info.ProviderDisplayName;
                if (info.Principal.HasClaim(c => c.Type == ClaimTypes.Email))
                {
                    Input = new InputModel
                    {
                        Email = info.Principal.FindFirstValue(ClaimTypes.Email) ?? "",
                        FirstName = info.Principal.FindFirstValue(ClaimTypes.GivenName)
                        ?? info.Principal.FindFirstValue("given_name")
                         ?? "",
                                LastName = info.Principal.FindFirstValue(ClaimTypes.Surname)
                        ?? info.Principal.FindFirstValue("family_name")
                        ?? "",
                    };
                }
                return Page();
            }
        }

        public async Task<IActionResult> OnPostConfirmationAsync(string returnUrl = null)
        {
            returnUrl ??= Url.Content("~/");

            var info = await _signInManager.GetExternalLoginInfoAsync();

            if (info == null)
            {
                ErrorMessage = "Error loading external login information during confirmation.";
                return RedirectToPage("./Login", new { ReturnUrl = returnUrl });
            }

            if (!ModelState.IsValid)
            {
                ProviderDisplayName = info.ProviderDisplayName;
                ReturnUrl = returnUrl;
                return Page();
            }

            var email = Input.Email.Trim();

            var existingUser = await _userManager.FindByEmailAsync(email);

            if (existingUser != null)
            {
                var addLogin = await _userManager.AddLoginAsync(existingUser, info);

                if (!addLogin.Succeeded)
                {
                    foreach (var e in addLogin.Errors)
                        ModelState.AddModelError(string.Empty, e.Description);

                    ProviderDisplayName = info.ProviderDisplayName;
                    ReturnUrl = returnUrl;
                    return Page();
                }

                if (_userManager.Options.SignIn.RequireConfirmedAccount && !existingUser.EmailConfirmed)
                {
                    await SendConfirmEmail(existingUser, returnUrl);
                    return RedirectToPage("./RegisterConfirmation", new { Email = email, returnUrl });
                }

                await _signInManager.SignInAsync(existingUser, isPersistent: false);
                return LocalRedirect(returnUrl);
            }

            var user = CreateUser();

            user.FirstName = Input.FirstName.Trim();
            user.LastName = Input.LastName.Trim();
            user.CreatedAt = DateTime.UtcNow;

            await _userStore.SetUserNameAsync(user, email, CancellationToken.None);
            await _emailStore.SetEmailAsync(user, email, CancellationToken.None);

            var create = await _userManager.CreateAsync(user);
            if (!create.Succeeded)
            {
                foreach (var e in create.Errors)
                    ModelState.AddModelError(string.Empty, e.Description);

                ProviderDisplayName = info.ProviderDisplayName;
                ReturnUrl = returnUrl;
                return Page();
            }

            var addExternal = await _userManager.AddLoginAsync(user, info);

            if (!addExternal.Succeeded)
            {
                await _userManager.DeleteAsync(user);
                foreach (var e in addExternal.Errors)
                    ModelState.AddModelError(string.Empty, e.Description);

                ProviderDisplayName = info.ProviderDisplayName;
                ReturnUrl = returnUrl;
                return Page();
            }

            const string DefaultRole = "Student";

            if (!await _userManager.IsInRoleAsync(user, DefaultRole))
                await _userManager.AddToRoleAsync(user, DefaultRole);

            try
            {
                await SendConfirmEmail(user, returnUrl);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed sending confirmation email to {Email}.", email);
                await _userManager.DeleteAsync(user);
                ModelState.AddModelError(string.Empty, "We couldn't send a confirmation email. Please try again.");
                ProviderDisplayName = info.ProviderDisplayName;
                ReturnUrl = returnUrl;
                return Page();
            }

            if (_userManager.Options.SignIn.RequireConfirmedAccount)
                return RedirectToPage("./RegisterConfirmation", new { Email = email, returnUrl });

            await _signInManager.SignInAsync(user, isPersistent: false);
            return LocalRedirect(returnUrl);
        }

        private GenUser CreateUser()
        {
            try
            {
                return Activator.CreateInstance<GenUser>();
            }
            catch
            {
                throw new InvalidOperationException($"Can't create an instance of '{nameof(GenUser)}'. " +
                    $"Ensure that '{nameof(GenUser)}' is not an abstract class and has a parameterless constructor, or alternatively " +
                    $"override the external login page in /Areas/Identity/Pages/Account/ExternalLogin.cshtml");
            }
        }

        private async Task SendConfirmEmail(GenUser user, string returnUrl)
        {
            var userId = await _userManager.GetUserIdAsync(user);
            var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
            var code = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));

            var callbackUrl = Url.Page(
                "/Account/ConfirmEmail",
                pageHandler: null,
                values: new { area = "Identity", userId, code, returnUrl },
                protocol: Request.Scheme)!;

            var safeFirst = HtmlEncoder.Default.Encode(user.FirstName ?? "");
            var safeUrl = HtmlEncoder.Default.Encode(callbackUrl);

            var htmlBody = $"""
                    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5">
                      <h2 style="margin:0 0 12px">Welcome to GenomiX{(string.IsNullOrWhiteSpace(safeFirst) ? "" : $", {safeFirst}")}!</h2>
                      <p>Finish setting up your account by confirming your email address.</p>
                      <p style="margin:20px 0">
                        <a href="{safeUrl}" style="background:#1a73e8;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">
                          Confirm my email
                        </a>
                      </p>
                      <p>If the button doesn't work, paste this link into your browser:</p>
                      <p style="word-break:break-all">{safeUrl}</p>
                    </div>
                    """;

            await _emailSender.SendEmailAsync(user.Email!, "Confirm your GenomiX account", htmlBody);
        }

        private IUserEmailStore<GenUser> GetEmailStore()
        {
            if (!_userManager.SupportsUserEmail)
            {
                throw new NotSupportedException("The default UI requires a user store with email support.");
            }
            return (IUserEmailStore<GenUser>)_userStore;
        }
    }
}
