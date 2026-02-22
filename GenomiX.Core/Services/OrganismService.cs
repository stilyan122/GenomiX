using GenomiX.Core.Interfaces;
using GenomiX.Infrastructure.Models;
using GenomiX.Infrastructure.Repo;

namespace GenomiX.Core.Services
{
    /// <summary>
    /// Provides methods for managing organisms, including adding, retrieving, updating, and deleting organism records
    /// asynchronously.
    /// </summary>
    public class OrganismService : IOrganismService
    {
        private IRepository<Organism> _repository;

        /// <summary>
        /// Initializes a new instance of the OrganismService class using the specified repository for data access
        /// operations.
        /// </summary>
        public OrganismService(IRepository<Organism> repository)
        {
            _repository = repository;
        }

        /// <inheritdoc />
        public async Task AddAsync(Organism organism)
        {
            await this._repository.AddAsync(organism);
        }

        /// <inheritdoc />
        public async Task DeleteAsync(object id)
        {
            await this._repository.DeleteAsync(id);
        }

        /// <inheritdoc />
        public async Task<IEnumerable<Organism>> GetAllAsync()
        {
            return this._repository.GetAll();
        }

        /// <inheritdoc />
        public async Task<Organism?> GetByIdAsync(object id)
        {
            return await this._repository.GetByIdAsync(id);
        }

        /// <inheritdoc />
        public async Task UpdateAsync(Organism organism)
        {
            await this._repository.UpdateAsync(organism);
        }
    }
}
