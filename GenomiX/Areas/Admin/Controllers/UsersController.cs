using GenomiX.Core.Interfaces;
using GenomiX.Infrastructure.Models;
using GenomiX.ViewModels.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace GenomiX.Areas.Admin.Controllers
{
    [Area("Admin")]
    [Authorize(Roles = "Admin")]
    [Route("admin/users")]
    public class UsersController : Controller
    {
        private readonly IDNAService _models;
        private readonly ISimulationService _simulations;
        private readonly IUserService _users;

        public UsersController(IDNAService models,
            ISimulationService simulations, IUserService users)
        {
            _models = models;
            _simulations = simulations;
            _users = users;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index()
        {
            ViewData["ActiveNav"] = "admin";

            var data = await _users.GetAllUsersAsync();

            var vm = new List<AdminUserListItemViewModel>();

            foreach (var record in data.Where(f => !f.Roles.Contains("Admin")))
            {
                var dnaModels = await _models.GetAllForUserAsync(record.UserId);
                var simulations = await _simulations.GetAllForUserAsync(record.UserId);

                var model = new AdminUserListItemViewModel
                {
                    UserId = record.UserId,
                    UserName = record.UserName,
                    Email = record.Email,
                    Roles = record.Roles.ToList(),
                    DnaModels = dnaModels.Count(),
                    Simulations = simulations.Count(),
                };

                vm.Add(model);
            }

            return View(vm);
        }

        [HttpGet("requests")]
        public async Task<IActionResult> Requests(string? status = "")
        {
            ViewData["ActiveNav"] = "admin";
            ViewData["Status"] = status ?? "";

            var data = await _users.GetRoleRequestsAsync(status);

            var vm = data.Select(r => new AdminRoleRequestListItemViewModel
            {
                Id = r.Id,
                UserId = r.UserId,
                UserName = r.UserName,
                Email = r.Email,
                RequestType = r.RequestType,
                RequestedRole = r.RequestedRole,
                Status = r.Status,
                Note = r.Note,
                CreatedAt = r.CreatedAt,
                DecidedAt = r.DecidedAt
            }).ToList();

            return View(vm);
        }

        [HttpPost("requests/approve/{id:int}")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Approve(int id)
        {
            await _users.ApproveRoleRequestAsync(id);
            return RedirectToAction(nameof(Requests));
        }

        [HttpPost("requests/decline/{id:int}")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Decline(int id, [FromForm] string? reason)
        {
            await _users.DeclineRoleRequestAsync(id, reason);
            return RedirectToAction(nameof(Requests));
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> Details(Guid id)
        {
            ViewData["ActiveNav"] = "admin";

            var u = await _users.GetUserByIdAsync(id);
            if (u == null) return NotFound();

            var reqs = await _users.GetRoleRequestsForUserAsync(id);

            var dnaModels = await _models.GetAllForUserAsync(u.UserId);
            var simulations = await _simulations.GetAllForUserAsync(u.UserId);

            var vm = new AdminUserDetailsViewModel
            {
                UserId = u.UserId,
                UserName = u.UserName,
                Email = u.Email,
                Roles = u.Roles.ToList(),
                DnaModels = dnaModels.Count(),
                Simulations = simulations.Count(),
                Requests = reqs.Select(r => new AdminRoleRequestListItemViewModel
                {
                    Id = r.Id,
                    UserId = r.UserId,
                    UserName = r.UserName,
                    Email = r.Email,
                    RequestType = r.RequestType,
                    RequestedRole = r.RequestedRole,
                    Status = r.Status,
                    Note = r.Note,
                    CreatedAt = r.CreatedAt,
                    DecidedAt = r.DecidedAt
                }).ToList()
            };

            return View(vm);
        }

        [HttpPost("{id:guid}/roles/add")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> AddRole(Guid id, [FromForm] string role)
        {
            try
            {
                await _users.AddRoleAsync(id, role);
                TempData["AdminOk"] = $"Role '{role}' added.";
            }
            catch (Exception ex)
            {
                TempData["AdminErr"] = ex.Message;
            }

            return RedirectToAction(nameof(Details), new { id });
        }

        [HttpPost("{id:guid}/roles/remove")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> RemoveRole(Guid id, [FromForm] string role)
        {
            try
            {
                await _users.RemoveRoleAsync(id, role);
                TempData["AdminOk"] = $"Role '{role}' removed.";
            }
            catch (Exception ex)
            {
                TempData["AdminErr"] = ex.Message;
            }

            return RedirectToAction(nameof(Details), new { id });
        }
    }
}
