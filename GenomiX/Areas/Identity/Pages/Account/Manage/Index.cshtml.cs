using System.ComponentModel.DataAnnotations;
using GenomiX.Infrastructure.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace GenomiX.Areas.Identity.Pages.Account.Manage
{
    [Authorize]
    public class IndexModel : PageModel
    {
        private readonly UserManager<GenUser> _userManager;
        private readonly SignInManager<GenUser> _signInManager;

        public IndexModel(UserManager<GenUser> userManager, SignInManager<GenUser> signInManager)
        {
            _userManager = userManager;
            _signInManager = signInManager;
        }

        public string Username { get; set; } = "";
        [TempData] public string? StatusMessage { get; set; }

        [BindProperty] public InputModel Input { get; set; } = new();

        public class InputModel
        {
            [Required, StringLength(100)]
            public string FirstName { get; set; } = "";

            [Required, StringLength(100)]
            public string LastName { get; set; } = "";
        }

        public async Task<IActionResult> OnGetAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return NotFound("Unable to load user.");

            Username = await _userManager.GetUserNameAsync(user) ?? "";
            Input = new InputModel
            {
                FirstName = user.FirstName ?? "",
                LastName = user.LastName ?? ""
            };

            return Page();
        }

        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid) return Page();

            var user = await _userManager.GetUserAsync(User);
            if (user == null) return NotFound("Unable to load user.");

            user.FirstName = Input.FirstName.Trim();
            user.LastName = Input.LastName.Trim();

            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
            {
                foreach (var e in result.Errors)
                    ModelState.AddModelError(string.Empty, e.Description);
                return Page();
            }

            await _signInManager.RefreshSignInAsync(user);
            StatusMessage = "Profile updated.";
            return RedirectToPage();
        }
    }
}
