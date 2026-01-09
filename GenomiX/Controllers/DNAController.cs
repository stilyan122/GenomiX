using GenomiX.Core.Interfaces;
using GenomiX.ViewModels.DNA;
using GenomiX.ViewModels.Sequence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using GenomiX.Infrastructure.Models;

namespace GenomiX.Controllers
{
    [Authorize]
    public class DNAController : Controller
    {
        private readonly IDNAService _DNAService;
        private readonly ISequenceService _sequenceService;
        private readonly UserManager<GenUser> _userManager;

        public DNAController(IDNAService DNAService, ISequenceService sequenceService, 
            UserManager<GenUser> userManager)
        {
            _DNAService = DNAService;
            _sequenceService = sequenceService;
            _userManager = userManager;
        }

        [Route("/dna/choose")]
        public IActionResult Choose()
        {
            return View();
        }

        [Route("/dna/models")]
        [Route("/dna")]
        public async Task<IActionResult> Models()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Challenge();

            var models = await _DNAService.GetAllForUserAsync(user.Id);

            var vms = models.Select(m => new DNAModelListViewModel
            {
                Id = m.Id,
                CreatedAt = m.CreatedAt,
                UpdatedAt = m.UpdatedAt,
                Name = m.Name,
                Length = m.Sequences.FirstOrDefault(s => s.Strand == 1)?.Sequence.Length ?? 0
            }).ToList();

            return View(vms);
        }

        [Route("/dna/builder/{id:guid}")]
        public async Task<IActionResult> Builder(Guid id)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Challenge();

            var model = await _DNAService.GetModelForUserWithSequencesAsync(user.Id, id);
            if (model == null) return NotFound();

            var s1 = model.Sequences.FirstOrDefault(x => x.Strand == 1)?.Sequence ?? "";
            var s2 = model.Sequences.FirstOrDefault(x => x.Strand == 2)?.Sequence ?? "";

            var vm = new DNABuilderViewModel
            {
                ModelId = model.Id,
                Strand1 = s1,
                Strand2 = s2,
                Name = model.Name
            };

            return View(vm);
        }

        [Route("dna/predefined")]
        public async Task<IActionResult> Predefined()
        {
            var predefinedServiceSequences = await this ._sequenceService
                .GetAllReferenceSequencesAsync();

            var sequenceViewModels = predefinedServiceSequences
                .Select(s => new SequenceViewModel()
            {
                Id = s.Id,
                Species = s.Species,
                Sequence = s.Sequence
            }).ToList();

            return View(sequenceViewModels);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        [Route("/dna/predefined/create/{referenceId:guid}")]
        public async Task<IActionResult> CreateFromReference(Guid referenceId, CreateCustomModelInputModel input)
        {
            var name = (input.Name ?? "").Trim();
            if (name.Length == 0) return BadRequest("Name is required.");

            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Challenge();

            var reference = await _sequenceService.GetReferenceSequenceByIdAsync(referenceId);
            if (reference == null) return NotFound();

            var now = DateTimeOffset.UtcNow;

            var model = new DNAModel
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Name = name,
                CreatedAt = now,
                UpdatedAt = now
            };

            var s1 = Normalize(reference.Sequence);
            var s2 = Complement(s1);

            model.Sequences.Add(new DNASequence
            {
                Id = Guid.NewGuid(),
                ModelId = model.Id,
                Strand = 1,
                Sequence = s1,
                CreatedAt = now
            });

            model.Sequences.Add(new DNASequence
            {
                Id = Guid.NewGuid(),
                ModelId = model.Id,
                Strand = 2,
                Sequence = s2,
                CreatedAt = now
            });

            await _DNAService.AddAsync(model);
            return RedirectToAction(nameof(Builder), new { id = model.Id });
        }

        [Route("dna/custom")]
        public IActionResult Custom()
        {
            return View();
        }

        [Authorize]
        [HttpPost]
        [ValidateAntiForgeryToken]
        [Route("dna/custom/create")]
        public async Task<IActionResult> CreateCustom(CreateCustomModelInputModel input)
        {
            if (!ModelState.IsValid)
            {
                TempData["CustomError"] = "Invalid input.";
                return RedirectToAction(nameof(Custom));
            }

            var name = (input.Name ?? "").Trim();
            if (name.Length == 0)
                return BadRequest("Name is required.");

            var user = await _userManager.GetUserAsync(User);

            if (user == null)
                return Challenge();

            var parsed = ParseStrictServer(input.RawInput);

            if (!parsed.Ok)
            {
                TempData["CustomError"] = parsed.Error;
                return RedirectToAction(nameof(Custom));
            }

            var now = DateTimeOffset.UtcNow;

            var model = new DNAModel
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                CreatedAt = now,
                UpdatedAt = now,
                Name = name
            };

            model.Sequences.Add(new DNASequence
            {
                Id = Guid.NewGuid(),
                ModelId = model.Id,
                Strand = 1,
                Sequence = parsed.S1,
                CreatedAt = now
            });

            model.Sequences.Add(new DNASequence
            {
                Id = Guid.NewGuid(),
                ModelId = model.Id,
                Strand = 2,
                Sequence = parsed.S2,
                CreatedAt = now
            });

            await _DNAService.AddAsync(model);

            return RedirectToAction(nameof(Builder), new { id = model.Id });
        }

        [Authorize]
        [HttpPost]
        [ValidateAntiForgeryToken]
        [Route("/dna/builder/save")]
        public async Task<IActionResult> SaveBuilder([FromBody] SaveModelRequest req)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Challenge();

            if (req.ModelId == Guid.Empty) return BadRequest("Missing model id.");
            var s1 = Normalize(req.Strand1);
            var s2 = Normalize(req.Strand2);

            if (s1.Length == 0 || s2.Length == 0) return BadRequest("Empty strands.");
            if (s1.Length != s2.Length) return BadRequest("Strands must have equal length.");

            bool IsValid(string s) => s.All(ch => ch is 'A' or 'C' or 'G' or 'T');
            if (!IsValid(s1) || !IsValid(s2)) return BadRequest("Invalid characters. Allowed: A,C,G,T.");;

            await _DNAService.UpdateModelSequencesAsync(user.Id, req.ModelId, s1, s2);
            return Ok(new { ok = true });
        }

        private static (bool Ok, string Error, string S1, string S2) ParseStrictServer(string raw)
        {
            var lines = (raw ?? "")
                .Split(new[] { "\r\n", "\n" }, StringSplitOptions.None)
                .Select(l => (l ?? "").Trim())
                .Where(l => l.Length > 0)
                .ToList();

            if (lines.Count == 0) return (false, "No sequence provided.", "", "");
            if (lines.Count > 2) return (false, "Provide one strand or two strands on two lines.", "", "");

            bool IsValid(string s) => s.All(ch => ch is 'A' or 'C' or 'G' or 'T');          

            var s1 = Normalize(lines[0]);
            if (!IsValid(s1)) return (false, "Invalid characters in strand 1. Allowed: A, C, G, T.", "", "");

            if (lines.Count == 1)
                return (true, "", s1, Complement(s1));

            char ComplementBase(char b) => b switch { 'A' => 'T', 'T' => 'A', 'C' => 'G', 'G' => 'C', _ => '?' };

            var s2 = Normalize(lines[1]);
            if (!IsValid(s2)) return (false, "Invalid characters in strand 2. Allowed: A, C, G, T.", "", "");
            if (s1.Length != s2.Length) return (false, $"Strands must have equal lengths. Got {s1.Length} and {s2.Length}.", "", "");

            for (int i = 0; i < s1.Length; i++)
            {
                var expected = Complement(s1[i].ToString())[0];
                if (s2[i] != ComplementBase(s1[i]))
                    return (false, $"Strands are not complementary at position {i + 1}.", "", "");
            }

            return (true, "", s1, s2);
        }

        private static string Normalize(string s)
        {
            var raw = (s ?? "").Trim().ToUpperInvariant();
            return new string(raw.Where(c => !char.IsWhiteSpace(c)).ToArray());
        }

        private static string Complement(string s)
        {
            var arr = s.ToCharArray();
            for (int i = 0; i < arr.Length; i++)
            {
                arr[i] = arr[i] switch
                {
                    'A' => 'T',
                    'T' => 'A',
                    'C' => 'G',
                    'G' => 'C',
                    _ => throw new ArgumentException("Invalid DNA base.")
                };
            }
            return new string(arr);
        }
    }
}
