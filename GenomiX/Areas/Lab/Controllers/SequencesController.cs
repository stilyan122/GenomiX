using GenomiX.Core.Interfaces;
using GenomiX.ViewModels.Lab;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using GenomiX.Infrastructure.Models;

namespace GenomiX.Areas.Lab.Controllers
{
    [Area("Lab")]
    [Authorize(Roles = "Scientist,Admin")]
    [Route("lab/sequences")]
    public class SequencesController : Controller
    {
        private readonly ISequenceService _sequences;
        private readonly UserManager<GenUser> _users;

        public SequencesController(ISequenceService sequences, UserManager<GenUser> users)
        {
            _sequences = sequences;
            _users = users;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index()
        {
            ViewData["ActiveNav"] = "lab";

            var user = await _users.GetUserAsync(User);
            if (user == null) return Challenge();

            var data = await _sequences.GetMineAsync(user.Id);

            var vm = data.Select(x => new ReferenceSequenceListItemViewModel
            {
                Id = x.Id,
                Species = x.Species,
                Name = x.Name,
                Length = x.Sequence?.Length ?? 0,
                IsApproved = x.IsApproved,
                IsRejected = x.IsRejected,
                RejectionReason = x.RejectionReason,
                CreatedAt = x.CreatedAt.ToString("yyyy-MM-dd HH:mm"),
                UpdatedAt = x.UpdatedAt?.ToString("yyyy-MM-dd HH:mm"),
            }).ToList();

            return View(vm);
        }

        [HttpGet("create")]
        public IActionResult Create()
        {
            ViewData["ActiveNav"] = "lab";
            return View(new CreateReferenceSequenceViewModel());
        }

        [HttpPost("create")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(CreateReferenceSequenceViewModel model)
        {
            ViewData["ActiveNav"] = "lab";

            if (!ModelState.IsValid)
                return View(model);

            var user = await _users.GetUserAsync(User);
            if (user == null) return Challenge();

            var sequence = (model.Sequence ?? "").Trim().ToUpperInvariant();

            await _sequences.CreateReferenceAsync(
                user.Id,
                (model.Species ?? "").Trim(),
                (model.Name ?? "").Trim(),
                sequence
            );

            return RedirectToAction(nameof(Index));
        }

        [HttpGet("edit/{id:guid}")]
        public async Task<IActionResult> Edit(Guid id)
        {
            ViewData["ActiveNav"] = "lab";

            var user = await _users.GetUserAsync(User);
            if (user == null) return Challenge();

            var seq = await _sequences.GetReferenceSequenceByIdAsync(id);
            if (seq == null) return NotFound();

            if (seq.CreatedByUserId != user.Id) return Forbid();
            if (seq.IsApproved) return Forbid();

            var vm = new EditReferenceSequenceViewModel
            {
                Id = seq.Id,
                Species = seq.Species,
                Name = seq.Name,
                Sequence = seq.Sequence
            };

            return View(vm);
        }

        [HttpPost("edit")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(EditReferenceSequenceViewModel model)
        {
            ViewData["ActiveNav"] = "lab";

            if (!ModelState.IsValid)
                return View(model);

            var user = await _users.GetUserAsync(User);
            if (user == null) return Challenge();

            var ok = await _sequences.UpdateReferenceAsync(
                user.Id,
                model.Id,
                (model.Species ?? "").Trim(),
                (model.Name ?? "").Trim(),
                (model.Sequence ?? "").Trim().ToUpperInvariant()
            );

            if (!ok) return Forbid();

            return RedirectToAction(nameof(Index));
        }

        [HttpPost("delete/{id:guid}")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(Guid id)
        {
            var user = await _users.GetUserAsync(User);
            if (user == null) return Challenge();

            var ok = await _sequences.DeleteReferenceAsync(user.Id, id);
            if (!ok) return Forbid();

            return RedirectToAction(nameof(Index));
        }
    }
}