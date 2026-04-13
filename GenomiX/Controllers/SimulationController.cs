using GenomiX.Core.Interfaces;
using GenomiX.Core.Models;
using GenomiX.Infrastructure.Models;
using GenomiX.ViewModels.Organism;
using GenomiX.ViewModels.Population;
using GenomiX.ViewModels.Simulation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using GenomiX.Core.ServiceHelpers;

namespace GenomiX.Controllers
{
    [Authorize(Roles = "User,Scientist,Admin")]
    public class SimulationController : Controller
    {
        private readonly ISimulationService _sim;
        private readonly IDNAService _dna;
        private readonly UserManager<GenUser> _users;

        public SimulationController(ISimulationService sim, IDNAService dna, UserManager<GenUser> users)
        {
            _sim = sim;
            _dna = dna;
            _users = users;
        }

        [Route("/simulations")]
        public async Task<IActionResult> Simulations()
        {
            var user = await _users.GetUserAsync(User);
            if (user == null) return Challenge();

            var pops = await _sim.GetAllForUserAsync(user.Id);

            var viewModels = pops.Select(p => new PopulationViewModel
            {
                Id = p.Id,
                Name = p.Name,
                CreatedAt = p.CreatedAt.ToString("yyyy-MM-dd HH:mm"),
                BaseModelId = p.BaseModelId,
                BaseModelName = p.BaseModel?.Name,
                Organisms = p.Organisms.Select(o => new OrganismViewModel
                {
                    Id = o.Id,
                }).ToList()
            }).ToList();

            return View(viewModels);
        }

        [Route("/simulations/create")]
        public async Task<IActionResult> Create()
        {
            var user = await _users.GetUserAsync(User);
            if (user == null) return Challenge();

            var models = await _dna.GetAllForUserAsync(user.Id);

            var vm = new CreatePopulationViewModel
            {
                Models = models.Select(m => new CreatePopulationViewModel.ModelOption
                {
                    Id = m.Id,
                    Name = m.Name,
                    Length = m.Sequences.FirstOrDefault(s => s.Strand == 1)?.Sequence?.Length ?? 0
                }).ToList()
            };

            return View(vm);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        [Route("/simulations/create")]
        public async Task<IActionResult> Create(CreatePopulationInputModel input)
        {
            var user = await _users.GetUserAsync(User);
            if (user == null) return Challenge();

            var name = (input.Name ?? "").Trim();
            if (name.Length == 0)
                ModelState.AddModelError(nameof(input.Name), "Name is required.");

            if (input.Size < 2 || input.Size > 5000)
                ModelState.AddModelError(nameof(input.Size), "Size must be 2-5000.");

            if (input.BaseModelId == Guid.Empty)
                ModelState.AddModelError(nameof(input.BaseModelId),
                    "Choose a base DNA model.");

            if (!ModelState.IsValid)
            {
                var models = await _dna.GetAllForUserAsync(user.Id);

                return View(new CreatePopulationViewModel
                {
                    Name = input?.Name ?? "New Population",
                    Size = input?.Size ?? 50,
                    BaseModelId = input.BaseModelId,
                    Temperature = input.Temperature,
                    Radiation = input.Radiation,
                    DiseasePressure = input.DiseasePressure,
                    Species = input.Species,
                    Resources = input.Resources,
                    Models = models.Select(m => new CreatePopulationViewModel.ModelOption
                    {
                        Id = m.Id,
                        Name = m.Name,
                        Length = m.Sequences.FirstOrDefault(s => s.Strand == 1)?.Sequence?.Length ?? 0
                    }).ToList()
                });
            }

            var factors = new SimFactors
            {
                Temperature = input.Temperature,
                Radiation = input.Radiation,
                DiseasePressure = input.DiseasePressure,
                Resources = input.Resources,
                Tick = 0,
                IsRunning = false,
                Speed = 1
            };

            var species = (input.Species ?? "mouse").Trim().ToLowerInvariant();

            var id = await _sim.CreateAsync(user.Id, name, input.BaseModelId, input.Size, species, factors);
            return RedirectToAction(nameof(Run), new { id });
        }

        [Route("/simulations/edit/{id:guid}")]
        public async Task<IActionResult> Edit(Guid id)
        {
            var user = await _users.GetUserAsync(User);
            if (user == null)
                return Challenge();

            var pop = await _sim.GetForUserAsync(user.Id, id);
            if (pop == null)
                return NotFound();

            return View(new EditPopulationInputModel
            {
                Id = pop.Id,
                Name = pop.Name
            }
            );
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        [Route("/simulations/edit")]
        public async Task<IActionResult> Edit(EditPopulationInputModel input)
        {
            var user = await _users.GetUserAsync(User);
            if (user == null)
                return Challenge();

            var name = (input.Name ?? "").Trim();

            if (name.Length == 0)
                ModelState.AddModelError(nameof(input.Name), "Name is required.");

            if (name.Length > 60)
                ModelState.AddModelError(nameof(input.Name), "Max 60 characters.");

            if (!ModelState.IsValid)
                return View(input);

            await _sim.RenameAsync(user.Id, input.Id, name);

            return RedirectToAction(nameof(Simulations));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        [Route("/simulations/delete/{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var user = await _users.GetUserAsync(User);

            if (user == null)
                return Challenge();

            await _sim.DeleteForUserAsync(user.Id, id);
            return RedirectToAction(nameof(Simulations));
        }

        [Route("/simulations/run/{id:guid}")]
        public async Task<IActionResult> Run(Guid id)
        {
            var user = await _users.GetUserAsync(User);
            if (user == null) return Challenge();

            var pop = await _sim.GetForUserAsync(user.Id, id);
            if (pop == null) return NotFound();

            var f = SimFactorsJsonHelper.Read(pop.Factors);

            var vm = new PopulationViewModel
            {
                Id = pop.Id,
                Name = pop.Name,
                CreatedAt = pop.CreatedAt.ToString("yyyy-MM-dd HH:mm"),
                BaseModelId = pop.BaseModelId,
                BaseModelName = pop?.BaseModel?.Name,
                Temperature = f.Temperature,
                Radiation = f.Radiation,
                DiseasePressure = f.DiseasePressure,
                Resources = f.Resources,
                Speed = f.Speed,
                Organisms = pop?.Organisms?.Select(o => new OrganismViewModel
                {
                    Id = o.Id,
                    Species = o.Type,
                    ScientificName = o.ScientificName,
                    SimpleName = o.SimpleName,
                    Status = o.Status,
                    SurvivalScore = o.SurvivalScore ?? 0
                })?.ToList() ?? new()
            };

            return View(vm);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        [Route("/simulations/{id:guid}/factors")]
        public async Task<IActionResult> UpdateFactors(Guid id, [FromBody] UpdateFactorsRequest req)
        {
            var user = await _users.GetUserAsync(User);
            if (user == null) return Challenge();

            req.Temperature = Math.Clamp(req.Temperature, -20, 60);
            req.Radiation = Math.Clamp(req.Radiation, 0, 1);
            req.DiseasePressure = Math.Clamp(req.DiseasePressure, 0, 1);
            req.Resources = Math.Clamp(req.Resources, 0, 1);

            var factors = new SimFactors
            {
                Temperature = req.Temperature,
                Radiation = req.Radiation,
                DiseasePressure = req.DiseasePressure,
                Resources = req.Resources,
                Speed = Math.Clamp(req.Speed, 1, 50),
            };

            await _sim.UpdateFactorsAsync(user.Id, id, factors);
            return Ok(new { ok = true });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        [Route("/simulations/{id:guid}/running")]
        public async Task<IActionResult> SetRunning(Guid id, [FromBody] SetRunningRequest req)
        {
            var user = await _users.GetUserAsync(User);
            if (user == null) return Challenge();

            await _sim.SetRunningAsync(user.Id, id, req.IsRunning);
            return Ok(new { ok = true });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        [Route("/simulations/{id:guid}/tick")]
        public async Task<IActionResult> Tick(Guid id, [FromBody] TickRequest req)
        {
            var user = await _users.GetUserAsync(User);
            if (user == null) return Challenge();

            var steps = Math.Clamp(req.Steps, 1, 200);
            var res = await _sim.TickAsync(user.Id, id, steps);

            return Ok(res);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        [Route("/simulations/{id:guid}/save")]
        public async Task<IActionResult> SaveState(Guid id, [FromBody] SaveStateRequest req)
        {
            var user = await _users.GetUserAsync(User);
            if (user == null) return Challenge();

            var orgs = req.Organisms
                .Select(o => (o.Id, o.Status, o.Fitness))
                .ToList();

            await _sim.SaveStateAsync(user.Id, id, orgs);

            return Ok(new { ok = true, savedAt = DateTimeOffset.UtcNow });
        }

    }
}
