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

        /// <summary>
        /// Initializes a new instance of the SimulationService class with the specified population and organism
        /// repositories.
        /// </summary>
        /// <param name="pops">The repository used to access and manage Population entities within the simulation.</param>
        /// <param name="orgs">The repository used to access and manage Organism entities within the simulation.</param>
        public SimulationService(IRepository<Population> pops, IRepository<Organism> orgs)
        {
            _pops = pops;
            _orgs = orgs;
        }

        /// <inheritdoc />
        public async Task<IReadOnlyList<Population>> GetAllForUserAsync(Guid userId)
            => await _pops.GetAll()
                .Where(p => p.UserId == userId)
                .Include(p => p.Organisms)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

        /// <inheritdoc />
        public async Task<Population?> GetForUserAsync(Guid userId, Guid populationId)
            => await _pops.GetAll()
                .Where(p => p.UserId == userId && p.Id == populationId)
                .Include(p => p.Organisms)
                .FirstOrDefaultAsync();

        /// <inheritdoc />
        public async Task<Guid> CreateAsync(Guid userId, string name, Guid baseModelId, int size, SimFactors factors)
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

            for (int i = 0; i < size; i++)
            {
                pop.Organisms.Add(new Organism
                {
                    Id = Guid.NewGuid(),
                    PopulationId = pop.Id,
                    CreatedAt = now,
                    Status = "alive",
                    SurvivalScore = 1.0,
                    DNA_Model_Id = baseModelId,  
                    SimpleName = $"Org {i + 1}",
                    ScientificName = $"GX-{i + 1:0000}"
                });
            }

            await _pops.AddAsync(pop);
            return pop.Id;
        }

        /// <inheritdoc />
        public async Task UpdateFactorsAsync(Guid userId, Guid populationId, SimFactors newFactors)
        {
            var pop = await _pops.GetAll()
                .FirstOrDefaultAsync(p => p.Id == populationId && p.UserId == userId);

            if (pop == null) 
                throw new InvalidOperationException("Population not found.");

            var old = SimFactorsJsonHelper.Read(pop.Factors);
            newFactors.Tick = old.Tick;
            newFactors.IsRunning = old.IsRunning;

            pop.Factors = SimFactorsJsonHelper.Write(newFactors);
            await _pops.UpdateAsync(pop);
        }

        /// <inheritdoc />
        public async Task SetRunningAsync(Guid userId, Guid populationId, bool isRunning)
        {
            var pop = await _pops.GetAll().FirstOrDefaultAsync(p => p.Id == populationId && p.UserId == userId);
            if (pop == null) throw new InvalidOperationException("Population not found.");

            var f = SimFactorsJsonHelper.Read(pop.Factors);
            f.IsRunning = isRunning;
            pop.Factors = SimFactorsJsonHelper.Write(f);

            await _pops.UpdateAsync(pop);
        }

        /// <inheritdoc />
        public async Task<SimTickResult> TickAsync(Guid userId, Guid populationId, int steps = 1)
        {
            var pop = await _pops.GetAll()
                .Where(p => p.Id == populationId && p.UserId == userId)
                .Include(p => p.Organisms)
                .FirstOrDefaultAsync();

            if (pop == null) throw new InvalidOperationException("Population not found.");

            var f = SimFactorsJsonHelper.Read(pop.Factors);

            for (int s = 0; s < Math.Max(1, steps); s++)
            {
                f.Tick++;

                foreach (var o in pop.Organisms)
                {
                    if (o.Status == "dead") continue;

                    var stress =
                        Math.Abs(f.Temperature - 22) / 30.0
                        + f.Radiation * 0.8
                        + f.DiseasePressure * 0.7
                        - f.Resources * 0.6;

                    stress = Math.Clamp(stress, 0, 2);

                    var survivalProb = Math.Clamp(0.85 - stress, 0.02, 0.98);
                    var reproProb = Math.Clamp(0.12 + f.Resources * 0.25 - stress * 0.2, 0.0, 0.6);

                    var r = Random.Shared.NextDouble();

                    if (r > survivalProb)
                    {
                        o.Status = "dead";
                        o.SurvivalScore = 0;
                        continue;
                    }

                    o.SurvivalScore = survivalProb;

                    if (Random.Shared.NextDouble() < reproProb)
                        o.Status = "reproduced";
                    else
                        o.Status = "alive";
                }
            }

            pop.Factors = SimFactorsJsonHelper.Write(f);
            await _pops.UpdateAsync(pop);

            var alive = pop.Organisms.Count(x => x.Status == "alive");
            var dead = pop.Organisms.Count(x => x.Status == "dead");
            var rep = pop.Organisms.Count(x => x.Status == "reproduced");
            var avg = pop.Organisms.Where(x => x.Status != "dead").Select(x => x.SurvivalScore ?? 0).DefaultIfEmpty(0).Average();

            return new SimTickResult { Tick = f.Tick, Alive = alive, Dead = dead, Reproduced = rep, AvgFitness = avg };
        }
    }

}
