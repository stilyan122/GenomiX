using GenomiX.Infrastructure.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.WebUtilities;
using System.ComponentModel.DataAnnotations;
using System.Text;
using System.Text.Encodings.Web;

namespace GenomiX.Areas.Identity.Pages.Account
{
    public class RegisterModel : PageModel
    {
        private readonly SignInManager<GenUser> _signInManager;
        private readonly UserManager<GenUser> _userManager;
        private readonly IUserStore<GenUser> _userStore;
        private readonly IUserEmailStore<GenUser> _emailStore;
        private readonly ILogger<RegisterModel> _logger;
        private readonly IEmailSender _emailSender;

        private const string DefaultRole = "Student";

        public RegisterModel(
            UserManager<GenUser> userManager,
            IUserStore<GenUser> userStore,
            SignInManager<GenUser> signInManager,
            ILogger<RegisterModel> logger,
            IEmailSender emailSender)
        {
            _userManager = userManager;
            _userStore = userStore;
            _emailStore = GetEmailStore();
            _signInManager = signInManager;
            _logger = logger;
            _emailSender = emailSender;
        }

        [BindProperty]
        public InputModel Input { get; set; } = default!;

        public string? ReturnUrl { get; set; }
        public IList<AuthenticationScheme> ExternalLogins { get; set; } = new List<AuthenticationScheme>();

        public class InputModel
        {
            [Required, EmailAddress]
            public string Email { get; set; } = string.Empty;

            [Required, StringLength(100, MinimumLength = 6)]
            [DataType(DataType.Password)]
            public string Password { get; set; } = string.Empty;

            [DataType(DataType.Password)]
            [Compare("Password", ErrorMessage = "The password and confirmation password do not match.")]
            public string ConfirmPassword { get; set; } = string.Empty;

            [Required, StringLength(100)]
            public string FirstName { get; set; } = string.Empty;

            [Required, StringLength(100)]
            public string LastName { get; set; } = string.Empty;
        }

        public async Task OnGetAsync(string? returnUrl = null)
        {
            ReturnUrl = returnUrl ?? Url.Content("~/");
            ExternalLogins = (await _signInManager.GetExternalAuthenticationSchemesAsync()).ToList();
        }

        public async Task<IActionResult> OnPostAsync(string? returnUrl = null)
        {
            ReturnUrl = returnUrl ?? Url.Content("~/");
            ExternalLogins = (await _signInManager.GetExternalAuthenticationSchemesAsync()).ToList();

            if (!ModelState.IsValid)
                return Page();

            var email = Input.Email.Trim();
            var user = CreateUser();

            await _userStore.SetUserNameAsync(user, email, CancellationToken.None);
            await _emailStore.SetEmailAsync(user, email, CancellationToken.None);

            user.FirstName = Input.FirstName.Trim();
            user.LastName = Input.LastName.Trim();
            user.CreatedAt = DateTime.UtcNow;

            var result = await _userManager.CreateAsync(user, Input.Password);

            if (result.Succeeded)
            {
                _logger.LogInformation("User {Email} created a new account.", email);

                if (!await _userManager.IsInRoleAsync(user, DefaultRole))
                {
                    var roleAdd = await _userManager.AddToRoleAsync(user, DefaultRole);
                    if (!roleAdd.Succeeded)
                    {
                        _logger.LogWarning("Role '{Role}' not assigned to user {UserId}. Errors: {Errors}",
                            DefaultRole, user.Id, string.Join(", ", roleAdd.Errors.Select(e => e.Description)));
                    }
                }

                var userId = await _userManager.GetUserIdAsync(user);
                var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
                var code = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));

                var callbackUrl = Url.Page(
                    "/Account/ConfirmEmail",
                    pageHandler: null,
                    values: new { area = "Identity", userId, code, returnUrl = ReturnUrl },
                    protocol: Request.Scheme)!;

                try
                {
                    var safeFirst = HtmlEncoder.Default.Encode(user.FirstName);
                    var safeUrl = HtmlEncoder.Default.Encode(callbackUrl);

                    await _emailSender.SendEmailAsync(
                        email,
                        "Confirm your GenomiX account",
                        $"""
                        <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5">
                          <h2 style="margin:0 0 12px">Welcome to GenomiX{(string.IsNullOrWhiteSpace(safeFirst) ? "" : $", {safeFirst}")}!</h2>
                          <p>Finish setting up your account by confirming your email address.</p>
                          <p style="margin:20px 0">
                            <a href="{safeUrl}" style="background:#1a73e8;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">
                              Confirm my email
                            </a>
                          </p>
                          <p>If the button doesn’t work, paste this link into your browser:</p>
                          <p style="word-break:break-all">{safeUrl}</p>
                        </div>
                        """);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed sending confirmation email to {Email}.", email);
                }

                if (_userManager.Options.SignIn.RequireConfirmedAccount)
                    return RedirectToPage("RegisterConfirmation", new { email, returnUrl = ReturnUrl });

                await _signInManager.SignInAsync(user, isPersistent: false);
                return LocalRedirect(ReturnUrl);
            }

            foreach (var error in result.Errors)
                ModelState.AddModelError(string.Empty, error.Description);

            return Page();
        }

        private GenUser CreateUser()
        {
            try { return Activator.CreateInstance<GenUser>()!; }
            catch
            {
                throw new InvalidOperationException($"Can't create an instance of '{nameof(GenUser)}'. Ensure it has a parameterless constructor.");
            }
        }

        private IUserEmailStore<GenUser> GetEmailStore()
        {
            if (!_userManager.SupportsUserEmail)
                throw new NotSupportedException("The default UI requires a user store with email support.");
            return (IUserEmailStore<GenUser>)_userStore;
        }
    }
}
