using GenomiX.Infrastructure;
using GenomiX.Infrastructure.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace GenomiX.Areas.Identity.Pages.Account.Manage
{
    [Authorize]
    public class RolesModel : PageModel
    {
        private static readonly string[] AllRequestableRoles = { "User", "Scientist" };

        private readonly UserManager<GenUser> _userManager;
        private readonly ApplicationDbContext _db;

        public RolesModel(UserManager<GenUser> userManager, ApplicationDbContext db)
        {
            _userManager = userManager;
            _db = db;
        }

        public IList<string> CurrentRoles { get; private set; } = new List<string>();
        public IList<RoleRequest> MyRequests { get; private set; } = new List<RoleRequest>();
        public IList<string> AvailableAddRoles { get; private set; } = new List<string>();
        public IList<string> AvailableRemoveRoles { get; private set; } = new List<string>();

        [BindProperty(SupportsGet = true)]
        public InputModel Input { get; set; } = new();

        public class InputModel
        {
            [Required]
            public string Type { get; set; } = "Add"; 

            [Required]
            public string Role { get; set; } = "Scientist";
        }

        public async Task OnGetAsync() => await LoadAsync();

        public async Task<IActionResult> OnPostRequestAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user is null) return NotFound();

            await LoadAsync(); 

            if (!ModelState.IsValid)
                return Page();

            var type = (Input.Type ?? "").Trim();
            var role = (Input.Role ?? "").Trim();

            if (type != "Add" && type != "Remove")
            {
                ModelState.AddModelError(string.Empty, "Invalid request type.");
                return Page();
            }

            if (role.Equals("Admin", StringComparison.OrdinalIgnoreCase))
            {
                ModelState.AddModelError(string.Empty, "You cannot request this role.");
                return Page();
            }

            if (!AllRequestableRoles.Contains(role, StringComparer.OrdinalIgnoreCase))
            {
                ModelState.AddModelError(string.Empty, "Invalid role.");
                return Page();
            }

            var roles = await _userManager.GetRolesAsync(user);

            if (type == "Add" && roles.Any(r => r.Equals(role, StringComparison.OrdinalIgnoreCase)))
            {
                ModelState.AddModelError(string.Empty, "You already have this role.");
                return Page();
            }

            if (type == "Remove" && !roles.Any(r => r.Equals(role, StringComparison.OrdinalIgnoreCase)))
            {
                ModelState.AddModelError(string.Empty, "You don't have this role to remove.");
                return Page();
            }

            var duplicatePending = await _db.RoleRequests.AnyAsync(r =>
                r.UserId == user.Id &&
                r.Status == "Pending" &&
                r.RequestType == type &&
                r.RequestedRole.ToLower() == role.ToLower());

            if (duplicatePending)
            {
                ModelState.AddModelError(string.Empty, "You already have a pending request for this.");
                return Page();
            }

            _db.RoleRequests.Add(new RoleRequest
            {
                UserId = user.Id,
                RequestedRole = role,
                RequestType = type,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();
            return RedirectToPage();
        }

        public async Task<IActionResult> OnPostCancelAsync(int id)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user is null) return NotFound();

            var req = await _db.RoleRequests.FirstOrDefaultAsync(r => r.Id == id && r.UserId == user.Id);
            if (req is null) return RedirectToPage();

            if (req.Status != "Pending") return RedirectToPage();

            _db.RoleRequests.Remove(req);
            await _db.SaveChangesAsync();

            return RedirectToPage();
        }

        private async Task LoadAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user is null) return;

            CurrentRoles = (await _userManager.GetRolesAsync(user)).OrderBy(r => r).ToList();

            AvailableRemoveRoles = CurrentRoles.ToList();
            AvailableAddRoles = AllRequestableRoles
                .Except(CurrentRoles, StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (Input.Type == "Remove")
            {
                if (!AvailableRemoveRoles.Contains(Input.Role, StringComparer.OrdinalIgnoreCase))
                    Input.Role = AvailableRemoveRoles.FirstOrDefault() ?? "User";
            }
            else
            {
                if (!AvailableAddRoles.Contains(Input.Role, StringComparer.OrdinalIgnoreCase))
                    Input.Role = AvailableAddRoles.FirstOrDefault() ?? "Scientist";
            }

            MyRequests = await _db.RoleRequests
                .Where(r => r.UserId == user.Id)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            ViewData["ActivePage"] = ManageNavPages.Roles;
        }
    }
}
