using GenomiX.Core.Interfaces;
using GenomiX.Infrastructure.Models;
using GenomiX.Infrastructure.Repo;

namespace GenomiX.Core.Services
{
    public class OrganismService : IOrganismService
    {
        private IRepository<Organism> _repository;

        public OrganismService(IRepository<Organism> repository)
        {
            _repository = repository;
        }

        public async Task AddAsync(Organism organism)
        {
            await this._repository.AddAsync(organism);
        }

        public async Task DeleteAsync(object id)
        {
            await this._repository.DeleteAsync(id);
        }

        public async Task<IEnumerable<Organism>> GetAllAsync()
        {
            return await this._repository.GetAllAsync();
        }

        public async Task<Organism?> GetByIdAsync(object id)
        {
            return await this._repository.GetByIdAsync(id);
        }

        public async Task UpdateAsync(Organism organism)
        {
            await this._repository.UpdateAsync(organism);
        }
    }
}
