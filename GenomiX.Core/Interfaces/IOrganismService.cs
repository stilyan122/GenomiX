using GenomiX.Infrastructure.Models;

namespace GenomiX.Core.Interfaces
{
    /// <summary>
    /// Defines CRUD operations for Organism entities.
    /// </summary>
    public interface IOrganismService
    {
        /// <summary>
        /// Retrieves all Organism entities.
        /// </summary>
        /// <returns>A task that represents the asynchronous operation. The task result contains an enumerable of Organism entities.</returns>
        Task<IEnumerable<Organism>> GetAllAsync();

        /// <summary>
        /// Retrieves a Organism entity by its identifier.
        /// </summary>
        /// <param name="id">The identifier of the Organism entity.</param>
        /// <returns>A task that represents the asynchronous operation. The task result contains the Organism entity if found; otherwise, null.</returns>
        Task<Organism?> GetByIdAsync(object id);

        /// <summary>
        /// Adds a new Organism entity.
        /// </summary>
        /// <param name="organism">The Organism entity to add.</param>
        /// <returns>A task that represents the asynchronous operation.</returns>
        Task AddAsync(Organism organism);

        /// <summary>
        /// Updates an existing Organism entity.
        /// </summary>
        /// <param name="organism">The Organism entity to update.</param>
        /// <returns>A task that represents the asynchronous operation.</returns>
        Task UpdateAsync(Organism organism);

        /// <summary>
        /// Deletes a Organism entity by its identifier.
        /// </summary>
        /// <param name="id">The identifier of the Organism entity to delete.</param>
        /// <returns>A task that represents the asynchronous operation.</returns>
        Task DeleteAsync(object id);
    }
}
