using System.ComponentModel.DataAnnotations;
using GenomiX.Infrastructure.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace GenomiX.Areas.Identity.Pages.Account.Manage
{
    [Authorize]
    public class SetPasswordModel : PageModel
    {
        private readonly UserManager<GenUser> _userManager;
        private readonly SignInManager<GenUser> _signInManager;

        public SetPasswordModel(UserManager<GenUser> userManager, SignInManager<GenUser> signInManager)
        {
            _userManager = userManager;
            _signInManager = signInManager;
        }

        [TempData] public string? StatusMessage { get; set; }
        [BindProperty] public InputModel Input { get; set; } = new();

        public class InputModel
        {
            [Required, DataType(DataType.Password), Display(Name = "New password")]
            public string NewPassword { get; set; } = "";

            [Required, DataType(DataType.Password), Compare(nameof(NewPassword))]
            public string ConfirmPassword { get; set; } = "";
        }

        public async Task<IActionResult> OnGetAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return NotFound("Unable to load user.");

            if (await _userManager.HasPasswordAsync(user))
                return RedirectToPage("./ChangePassword");

            ViewData["HasPassword"] = await _userManager.HasPasswordAsync(user);

            return Page();
        }

        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid) return Page();

            var user = await _userManager.GetUserAsync(User);
            if (user == null) return NotFound("Unable to load user.");

            var result = await _userManager.AddPasswordAsync(user, Input.NewPassword);
            if (!result.Succeeded)
            {
                foreach (var e in result.Errors) ModelState.AddModelError(string.Empty, e.Description);
                return Page();
            }

            await _signInManager.RefreshSignInAsync(user);
            StatusMessage = "Password set.";
            return RedirectToPage();
        }
    }
}
