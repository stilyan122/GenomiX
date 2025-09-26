using GenomiX.Infrastructure.Models;

namespace GenomiX.Core.Interfaces
{
    /// <summary>
    /// Defines CRUD operations for DNA entities.
    /// </summary>
    public interface IDNAService
    {
        /// <summary>
        /// Retrieves all DNA entities.
        /// </summary>
        /// <returns>A task that represents the asynchronous operation. The task result contains an enumerable of DNA entities.</returns>
        Task<IEnumerable<DNAModel>> GetAllAsync();

        /// <summary>
        /// Retrieves a DNA entity by its identifier.
        /// </summary>
        /// <param name="id">The identifier of the DNA entity.</param>
        /// <returns>A task that represents the asynchronous operation. The task result contains the DNA entity if found; otherwise, null.</returns>
        Task<DNAModel?> GetByIdAsync(object id);

        /// <summary>
        /// Adds a new DNA entity.
        /// </summary>
        /// <param name="dna">The DNA entity to add.</param>
        /// <returns>A task that represents the asynchronous operation.</returns>
        Task AddAsync(DNAModel dna);

        /// <summary>
        /// Updates an existing DNA entity.
        /// </summary>
        /// <param name="dna">The DNA entity to update.</param>
        /// <returns>A task that represents the asynchronous operation.</returns>
        Task UpdateAsync(DNAModel dna);

        /// <summary>
        /// Deletes a DNA entity by its identifier.
        /// </summary>
        /// <param name="id">The identifier of the DNA entity to delete.</param>
        /// <returns>A task that represents the asynchronous operation.</returns>
        Task DeleteAsync(object id);
    }
}
