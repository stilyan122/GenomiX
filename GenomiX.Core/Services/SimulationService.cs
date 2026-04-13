using GenomiX.Core.Interfaces;
using GenomiX.Core.Models;
using GenomiX.Core.ServiceHelpers;
using GenomiX.Infrastructure.Models;
using GenomiX.Infrastructure.Repo;
using Microsoft.EntityFrameworkCore;

namespace GenomiX.Core.Services
{
    public class SimulationService : ISimulationService
    {
        private readonly IRepository<Population> _pops;
        private readonly IRepository<Organism> _orgs;

        public SimulationService(IRepository<Population> pops, IRepository<Organism> orgs)
        {
            _pops = pops; _orgs = orgs;
        }

        public async Task<IReadOnlyList<Population>> GetAllForUserAsync(Guid userId)
            => await _pops.GetAll().Where(p => p.UserId == userId)
                .Include(p => p.Organisms).Include(p => p.BaseModel)
                .OrderByDescending(p => p.CreatedAt).ToListAsync();

        public async Task<Population?> GetForUserAsync(Guid userId, Guid populationId)
            => await _pops.GetAll()
                .Where(p => p.UserId == userId && p.Id == populationId)
                .Include(p => p.Organisms).Include(p => p.BaseModel)
                .FirstOrDefaultAsync();

        public async Task<Guid> CreateAsync(Guid userId, string name, Guid baseModelId,
            int size, string species, SimFactors factors)
        {
            var now = DateTimeOffset.UtcNow;
            var pop = new Population
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Name = name.Trim(),
                BaseModelId = baseModelId,
                CreatedAt = now,
                Factors = SimFactorsJsonHelper.Write(factors)
            };

            string PickSpecies(int i) => species == "mixed"
                ? new[] { "mouse", "pig", "cow", "rabbit", "fox", "bird" }[i % 6] : species;

            for (int i = 0; i < size; i++)
            {
                var sp = PickSpecies(i);
                pop.Organisms.Add(new Organism
                {
                    Id = Guid.NewGuid(),
                    PopulationId = pop.Id,
                    CreatedAt = now,
                    Status = "alive",
                    SurvivalScore = 0.78,
                    Fitness = 0.78,
                    Type = sp,
                    SimpleName = $"{char.ToUpper(sp[0]) + sp.Substring(1)} {i + 1}",
                    ScientificName = $"GX-{sp.ToUpperInvariant()}-{i + 1:0000}",
                    DNA_Model_Id = baseModelId
                });
            }

            await _pops.AddAsync(pop);
            return pop.Id;
        }

        public async Task UpdateFactorsAsync(Guid userId, Guid populationId, SimFactors newFactors)
        {
            var pop = await _pops.GetAll()
                .FirstOrDefaultAsync(p => p.Id == populationId && p.UserId == userId)
                ?? throw new InvalidOperationException("Population not found.");
            var old = SimFactorsJsonHelper.Read(pop.Factors);
            newFactors.Tick = old.Tick; newFactors.IsRunning = old.IsRunning;
            pop.Factors = SimFactorsJsonHelper.Write(newFactors);
            await _pops.UpdateAsync(pop);
        }

        public async Task SetRunningAsync(Guid userId, Guid populationId, bool isRunning)
        {
            var pop = await _pops.GetAll()
                .FirstOrDefaultAsync(p => p.Id == populationId && p.UserId == userId)
                ?? throw new InvalidOperationException("Population not found.");
            var f = SimFactorsJsonHelper.Read(pop.Factors);
            f.IsRunning = isRunning;
            pop.Factors = SimFactorsJsonHelper.Write(f);
            await _pops.UpdateAsync(pop);
        }

        public async Task<SimTickResult> TickAsync(Guid userId, Guid populationId, int steps = 1)
        {
            var pop = await _pops.GetAll()
                .Where(p => p.Id == populationId && p.UserId == userId)
                .Include(p => p.Organisms)
                .FirstOrDefaultAsync()
                ?? throw new InvalidOperationException("Population not found.");

            var f = SimFactorsJsonHelper.Read(pop.Factors);

            // Collect offspring per tick — inserted via _orgs after the loop
            var offspringPerTick = new List<Organism>();

            for (int s = 0; s < Math.Max(1, steps); s++)
            {
                f.Tick++;
                offspringPerTick.Clear();

                // Reset previous reproduction markers
                foreach (var o in pop.Organisms.Where(x => x.Status == "reproduced"))
                    o.Status = "alive";

                // All unique species currently alive (for hybrid offspring)
                var aliveSpecies = pop.Organisms
                    .Where(o => o.Status != "dead")
                    .Select(o => o.Type).Distinct().ToList();

                foreach (var o in pop.Organisms)
                {
                    if (o.Status == "dead") continue;

                    // ── Environmental stress ──────────────────────────
                    double tempStress = Math.Pow(Math.Abs(f.Temperature - 22.0) / 40.0, 1.4);
                    double stress = Math.Clamp(
                        tempStress + f.Radiation * 0.85 + f.DiseasePressure * 0.70 - f.Resources * 0.55,
                        0.0, 2.0);

                    // ── Fitness drift (accumulated) ───────────────────
                    double drift = -stress * 0.032 + f.Resources * 0.016
                                 + (Random.Shared.NextDouble() - 0.5) * 0.010;
                    o.Fitness = Math.Clamp(o.Fitness + drift, 0.0, 1.0);
                    o.SurvivalScore = o.Fitness;

                    // ── Position drift ────────────────────────────────
                    double posDrift = 0.004 + stress * 0.006;
                    o.X = Math.Clamp(o.X + (float)((Random.Shared.NextDouble() - 0.5) * posDrift), 0f, 1f);
                    o.Y = Math.Clamp(o.Y + (float)((Random.Shared.NextDouble() - 0.5) * posDrift), 0f, 1f);

                    // ── Death ─────────────────────────────────────────
                    double lowFitnessPenalty = Math.Pow(Math.Max(0, 0.5 - o.Fitness) * 2.0, 2.0) * 0.30;
                    double deathChance = Math.Clamp(stress * 0.048 + lowFitnessPenalty - f.Resources * 0.012, 0.001, 0.60);
                    if (Random.Shared.NextDouble() < deathChance)
                    {
                        o.Status = "dead"; o.Fitness = 0; continue;
                    }

                    // ── Reproduction ──────────────────────────────────
                    if (o.Fitness > 0.82 && f.Resources > 0.50
                        && Random.Shared.NextDouble() < 0.015)
                    {
                        o.Status = "reproduced";

                        // Pick offspring species: 80% same, 20% hybrid from pop
                        string childSpecies = o.Type;
                        if (aliveSpecies.Count > 1 && Random.Shared.NextDouble() < 0.20)
                        {
                            var others = aliveSpecies.Where(sp => sp != o.Type).ToList();
                            childSpecies = others[Random.Shared.Next(others.Count)];
                        }

                        string spPart = char.ToUpper(childSpecies[0]) + childSpecies.Substring(1);
                        var child = new Organism
                        {
                            Id = Guid.NewGuid(),
                            PopulationId = pop.Id,
                            CreatedAt = DateTimeOffset.UtcNow,
                            Status = "alive",
                            Fitness = Math.Clamp(o.Fitness - 0.04 + Random.Shared.NextDouble() * 0.08, 0.55, 0.92),
                            SurvivalScore = o.Fitness * 0.94,
                            Type = childSpecies,
                            SimpleName = $"{spPart} Gen.{f.Tick}",
                            ScientificName = $"GX-{childSpecies.ToUpperInvariant()}-OFF-{f.Tick:0000}",
                            DNA_Model_Id = o.DNA_Model_Id,
                            X = Math.Clamp(o.X + (float)(Random.Shared.NextDouble() - 0.5) * 0.10f, 0f, 1f),
                            Y = Math.Clamp(o.Y + (float)(Random.Shared.NextDouble() - 0.5) * 0.08f, 0f, 1f),
                        };
                        offspringPerTick.Add(child);
                    }
                }

                // Insert offspring for this step
                // Using _orgs.AddAsync here is safe: it calls SaveChangesAsync which
                // also persists all in-flight organism Status/Fitness modifications.
                foreach (var child in offspringPerTick)
                    await _orgs.AddAsync(child);
            }

            // Update population factors — UpdateAsync also re-persists tracked organisms
            pop.Factors = SimFactorsJsonHelper.Write(f);
            await _pops.UpdateAsync(pop);

            // Reload population so offspring appear in result
            var updatedPop = await _pops.GetAll()
                .Where(p => p.Id == populationId)
                .Include(p => p.Organisms)
                .FirstOrDefaultAsync() ?? pop;

            int alive = updatedPop.Organisms.Count(x => x.Status is "alive" or "reproduced");
            int dead = updatedPop.Organisms.Count(x => x.Status == "dead");
            int rep = updatedPop.Organisms.Count(x => x.Status == "reproduced");
            double avg = updatedPop.Organisms.Where(x => x.Status != "dead")
                             .Select(x => x.Fitness).DefaultIfEmpty(0).Average();

            return new SimTickResult
            {
                Tick = f.Tick,
                Alive = alive,
                Dead = dead,
                Reproduced = rep,
                AvgFitness = Math.Round(avg, 4),
                Organisms = updatedPop.Organisms.Select(o => new SimOrgDto
                {
                    Id = o.Id,
                    Status = o.Status,
                    Fitness = o.Fitness,
                    X = o.X,
                    Y = o.Y,
                    Name = o.SimpleName,
                    Species = o.Type
                }).ToList()
            };
        }

        public async Task RenameAsync(Guid userId, Guid populationId, string name)
        {
            var pop = await _pops.GetAll()
                .FirstOrDefaultAsync(p => p.Id == populationId && p.UserId == userId)
                ?? throw new InvalidOperationException("Population not found.");
            pop.Name = (name ?? "").Trim();
            if (pop.Name.Length == 0) throw new InvalidOperationException("Name is required.");
            await _pops.UpdateAsync(pop);
        }

        public async Task DeleteForUserAsync(Guid userId, Guid populationId)
        {
            var pop = await _pops.GetAll()
                .FirstOrDefaultAsync(p => p.Id == populationId && p.UserId == userId)
                ?? throw new InvalidOperationException("Population not found.");
            var orgs = await _orgs.GetAll().Where(o => o.PopulationId == populationId).ToListAsync();
            foreach (var o in orgs) await _orgs.DeleteAsync(o.Id);
            await _pops.DeleteAsync(populationId);
        }

        public async Task SaveStateAsync(Guid userId, Guid populationId,
            List<(Guid id, string status, double fitness)> organisms)
        {
            // Verify ownership
            var owns = await _pops.GetAll()
                .AnyAsync(p => p.Id == populationId && p.UserId == userId);
            if (!owns) throw new InvalidOperationException("Population not found.");

            var payload = organisms.ToDictionary(o => o.id);

            // Load every organism for this population
            var dbOrgs = await _orgs.GetAll()
                .Where(o => o.PopulationId == populationId)
                .ToListAsync();

            foreach (var org in dbOrgs)
            {
                if (!payload.TryGetValue(org.Id, out var dto)) continue;

                if (dto.status == "dead")
                {
                    // Remove dead organisms so they don't ghost-appear on next load
                    await _orgs.DeleteAsync(org.Id);
                }
                else
                {
                    org.Status = dto.status;
                    org.Fitness = dto.fitness;
                    org.SurvivalScore = dto.fitness;
                    await _orgs.UpdateAsync(org);
                }
            }
        }
    }
}
