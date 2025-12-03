using GenomiX.Infrastructure.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace GenomiX.Areas.Identity.Pages.Account
{
    public class RegisterConfirmationModel : PageModel
    {
        private readonly UserManager<GenUser> _userManager;
        private readonly IEmailSender _emailSender;

        public RegisterConfirmationModel(
            UserManager<GenUser> userManager,
            IEmailSender emailSender)
        {
            _userManager = userManager;
            _emailSender = emailSender;
        }

        public string Email { get; set; } = string.Empty;
        public bool DisplayConfirmAccountLink { get; set; }
        public string? EmailConfirmationUrl { get; set; }

        public async Task OnGetAsync(string email, string? returnUrl = null)
        {
            Email = email;

            if (string.IsNullOrEmpty(email))
            {
                return;
            }

            var user = await _userManager.FindByEmailAsync(email);
            if (user == null)
            {
                return;
            }

            DisplayConfirmAccountLink = false;
        }
    }
}
