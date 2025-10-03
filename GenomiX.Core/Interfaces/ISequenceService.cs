using GenomiX.Infrastructure.Models;

namespace GenomiX.Core.Interfaces
{
    /// <summary>
    /// Defines CRUD operations for Sequence entities.
    /// </summary>
    public interface ISequenceService
    {
        /// <summary>
        /// Retrieves all Sequence entities.
        /// </summary>
        /// <returns>A task that represents the asynchronous operation. The task result contains an enumerable of Sequence entities.</returns>
        Task<IEnumerable<DNASequence>> GetAllUserSequencesAsync();

        /// <summary>
        /// Retrieves all Reference Sequence entities.
        /// </summary>
        /// <returns>A task that represents the asynchronous operation. The task result contains an enumerable of Reference Sequence entities.</returns>
        Task<IEnumerable<ReferenceSequence>> GetAllReferenceSequencesAsync();

        /// <summary>
        /// Retrieves a Sequence entity by its identifier.
        /// </summary>
        /// <param name="id">The identifier of the Sequence entity.</param>
        /// <returns>A task that represents the asynchronous operation. The task result contains the Sequence entity if found; otherwise, null.</returns>
        Task<DNASequence?> GetUserSequenceByIdAsync(object id);

        /// <summary>
        /// Retrieves a Reference Sequence entity by its identifier.
        /// </summary>
        /// <param name="id">The identifier of the Reference Sequence entity.</param>
        /// <returns>A task that represents the asynchronous operation. The task result contains the Reference Sequence entity if found; otherwise, null.</returns>
        Task<ReferenceSequence?> GetReferenceSequenceByIdAsync(object id);

        /// <summary>
        /// Adds a new Sequence entity.
        /// </summary>
        /// <param name="dna">The Sequence entity to add.</param>
        /// <returns>A task that represents the asynchronous operation.</returns>
        Task AddUserSequenceAsync(DNASequence dna);

        /// <summary>
        /// Adds a new Reference Sequence entity.
        /// </summary>
        /// <param name="dna">The Reference Sequence entity to add.</param>
        /// <returns>A task that represents the asynchronous operation.</returns>
        Task AddReferenceSequenceAsync(ReferenceSequence dna);

        /// <summary>
        /// Updates an existing Sequence entity.
        /// </summary>
        /// <param name="dna">The Sequence entity to update.</param>
        /// <returns>A task that represents the asynchronous operation.</returns>
        Task UpdateUserSequenceAsync(DNASequence dna);

        /// <summary>
        /// Updates an existing Reference Sequence entity.
        /// </summary>
        /// <param name="dna">The Reference Sequence entity to update.</param>
        /// <returns>A task that represents the asynchronous operation.</returns>
        Task UpdateReferenceSequenceAsync(ReferenceSequence dna);

        /// <summary>
        /// Deletes a Sequence entity by its identifier.
        /// </summary>
        /// <param name="id">The identifier of the Sequence entity to delete.</param>
        /// <returns>A task that represents the asynchronous operation.</returns>
        Task DeleteUserSequenceAsync(object id);

        /// <summary>
        /// Deletes a Reference Sequence entity by its identifier.
        /// </summary>
        /// <param name="id">The identifier of the Reference Sequence entity to delete.</param>
        /// <returns>A task that represents the asynchronous operation.</returns>
        Task DeleteReferenceSequenceAsync(object id);
    }
}
