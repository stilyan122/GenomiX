using GenomiX.Core.Interfaces;
using GenomiX.ViewModels.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GenomiX.Areas.Admin.Controllers
{
    [Area("Admin")]
    [Authorize(Roles = "Admin")]
    [Route("admin/sequences")]
    public class SequencesController : Controller
    {
        private readonly ISequenceService _sequences;

        public SequencesController(ISequenceService sequences)
        {
            _sequences = sequences;
        }

        [HttpGet("")]
        public async Task<IActionResult> Pending()
        {
            ViewData["ActiveNav"] = "admin";

            var data = await _sequences.GetPendingAsync();

            var vm = data.Select(x => new AdminReferenceSequenceListItemViewModel
            {
                Id = x.Id,
                Species = x.Species,
                Name = x.Name,
                Length = x.Sequence?.Length ?? 0,
                CreatedAt = x.CreatedAt.ToString("yyyy-MM-dd HH:mm"),
                CreatedBy = x.CreatedByUser?.Email ?? "Unknown"
            }).ToList();

            return View(vm);
        }

        [HttpGet("approved")]
        public async Task<IActionResult> Approved()
        {
            ViewData["ActiveNav"] = "admin";

            var data = await _sequences.GetApprovedAsync();

            var vm = data.Select(x => new AdminReferenceSequenceListItemViewModel
            {
                Id = x.Id,
                Species = x.Species,
                Name = x.Name,
                Length = x.Sequence?.Length ?? 0,
                CreatedAt = x.CreatedAt.ToString("yyyy-MM-dd HH:mm"),
                CreatedBy = x.CreatedByUser?.Email ?? "Unknown"
            }).ToList();

            return View(vm);
        }

        [HttpGet("rejected")]
        public async Task<IActionResult> Rejected()
        {
            ViewData["ActiveNav"] = "admin";

            var data = await _sequences.GetRejectedAsync();

            var vm = data.Select(x => new AdminReferenceSequenceListItemViewModel
            {
                Id = x.Id,
                Species = x.Species,
                Name = x.Name,
                Length = x.Sequence?.Length ?? 0,
                CreatedAt = x.CreatedAt.ToString("yyyy-MM-dd HH:mm"),
                CreatedBy = x.CreatedByUser?.Email ?? "Unknown"
            }).ToList();

            return View(vm);
        }

        [HttpGet("review/{id:guid}")]
        public async Task<IActionResult> Review(Guid id)
        {
            ViewData["ActiveNav"] = "admin";

            var seq = await _sequences.GetReferenceSequenceByIdAsync(id);
            if (seq == null) return NotFound();

            var vm = new ReviewReferenceSequenceViewModel
            {
                Id = seq.Id,
                Species = seq.Species,
                Name = seq.Name,
                Sequence = seq.Sequence,
                Length = seq.Sequence?.Length ?? 0,
                CreatedAt = seq.CreatedAt.ToString("yyyy-MM-dd HH:mm"),
                IsApproved = seq.IsApproved,
                IsRejected = seq.IsRejected,
                RejectionReason = seq.RejectionReason,
                CreatedBy = seq.CreatedByUser?.Email ?? "Unknown"
            };

            return View(vm);
        }

        [HttpPost("approve/{id:guid}")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Approve(Guid id)
        {
            await _sequences.ApproveReferenceAsync(id);
            return RedirectToAction(nameof(Pending));
        }

        [HttpPost("reject")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Reject(RejectReferenceSequenceInputModel model)
        {
            var reason = (model.Reason ?? "").Trim();
            if (reason.Length == 0) reason = "Rejected.";

            await _sequences.RejectReferenceAsync(model.Id, reason);
            return RedirectToAction(nameof(Pending));
        }
    }
}