using System.ComponentModel.DataAnnotations;
using System.Text;
using System.Text.Encodings.Web;
using GenomiX.Infrastructure.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.WebUtilities;

namespace GenomiX.Areas.Identity.Pages.Account.Manage
{
    [Authorize]
    public class EmailModel : PageModel
    {
        private readonly UserManager<GenUser> _userManager;
        private readonly SignInManager<GenUser> _signInManager;
        private readonly IEmailSender _emailSender;

        public EmailModel(UserManager<GenUser> userManager, SignInManager<GenUser> signInManager, IEmailSender emailSender)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _emailSender = emailSender;
        }

        public string Email { get; set; } = "";
        public bool IsEmailConfirmed { get; set; }
        [TempData] public string? StatusMessage { get; set; }

        [BindProperty] public InputModel Input { get; set; } = new();

        public class InputModel
        {
            [Required, EmailAddress]
            public string NewEmail { get; set; } = "";
        }

        public async Task<IActionResult> OnGetAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return NotFound("Unable to load user.");

            Email = await _userManager.GetEmailAsync(user) ?? "";
            IsEmailConfirmed = await _userManager.IsEmailConfirmedAsync(user);

            ViewData["HasPassword"] = await _userManager.HasPasswordAsync(user);

            return Page();
        }

        public async Task<IActionResult> OnPostSendVerificationEmailAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return NotFound("Unable to load user.");

            var email = await _userManager.GetEmailAsync(user);
            if (string.IsNullOrWhiteSpace(email)) return RedirectToPage();

            await SendConfirmEmail(user, email, isChangeEmail: false);

            StatusMessage = "Verification email sent.";
            return RedirectToPage();
        }

        public async Task<IActionResult> OnPostChangeEmailAsync()
        {
            if (!ModelState.IsValid) return Page();

            var user = await _userManager.GetUserAsync(User);
            if (user == null) return NotFound("Unable to load user.");

            var newEmail = Input.NewEmail.Trim();
            var existing = await _userManager.FindByEmailAsync(newEmail);
            if (existing != null && existing.Id != user.Id)
            {
                ModelState.AddModelError("Input.NewEmail", "This email is already in use.");
                return Page();
            }

            await SendConfirmEmail(user, newEmail, isChangeEmail: true);

            StatusMessage = "Confirmation email sent. Please check your inbox.";
            return RedirectToPage();
        }

        private async Task SendConfirmEmail(GenUser user, string targetEmail, bool isChangeEmail)
        {
            string token;
            string page;
            object routeValues;

            if (isChangeEmail)
            {
                token = await _userManager.GenerateChangeEmailTokenAsync(user, targetEmail);
                page = "/Account/ConfirmEmailChange";
                routeValues = new { area = "Identity", userId = user.Id, email = targetEmail, code = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token)) };
            }
            else
            {
                token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
                page = "/Account/ConfirmEmail";
                routeValues = new { area = "Identity", userId = user.Id, code = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token)) };
            }

            var url = Url.Page(page, null, routeValues, Request.Scheme)!;

            var safeUrl = HtmlEncoder.Default.Encode(url);
            await _emailSender.SendEmailAsync(
                targetEmail,
                isChangeEmail ? "Confirm your new GenomiX email" : "Confirm your GenomiX email",
                $"""
                <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5">
                  <h2 style="margin:0 0 12px">Confirm your email</h2>
                  <p>Please confirm by clicking:</p>
                  <p style="margin:20px 0">
                    <a href="{safeUrl}" style="background:#1a73e8;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">
                      Confirm email
                    </a>
                  </p>
                  <p style="word-break:break-all">{safeUrl}</p>
                </div>
                """);
        }
    }
}
