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
        /// Updates an existing Sequence entity.
        /// </summary>
        /// <param name="dna">The Sequence entity to update.</param>
        /// <returns>A task that represents the asynchronous operation.</returns>
        Task UpdateUserSequenceAsync(DNASequence dna);

        /// <summary>
        /// Deletes a Sequence entity by its identifier.
        /// </summary>
        /// <param name="id">The identifier of the Sequence entity to delete.</param>
        /// <returns>A task that represents the asynchronous operation.</returns>
        Task DeleteUserSequenceAsync(object id);

        /// <summary>
        /// Asynchronously retrieves a read-only list of approved reference sequences.
        /// </summary>
        Task<IReadOnlyList<ReferenceSequence>> GetApprovedAsync();

        /// <summary>
        /// Asynchronously retrieves a read-only list of reference sequences that are pending processing.
        /// </summary>
        Task<IReadOnlyList<ReferenceSequence>> GetPendingAsync();

        /// <summary>
        /// Asynchronously retrieves a read-only list of reference sequences that have been rejected.
        /// </summary>
        Task<IReadOnlyList<ReferenceSequence>> GetRejectedAsync();

        /// <summary>
        /// Retrieves all reference sequences associated with the specified user.
        /// </summary>
        Task<IReadOnlyList<ReferenceSequence>> GetMineAsync(Guid userId);

        /// <summary>
        /// Retrieves a list of reference sequences that are pending mining for the specified user.
        /// </summary>
        /// <param name="userId">The unique identifier of the user for whom pending reference sequences are retrieved. Cannot be null or
        /// empty.</param>
        Task<IReadOnlyList<ReferenceSequence>> GetPendingMineAsync(Guid userId);

        /// <summary>
        /// Asynchronously approves the reference identified by the specified unique identifier.
        /// </summary>
        Task<bool> ApproveReferenceAsync(Guid id);

        /// <summary>
        /// Asynchronously rejects a reference identified by the specified ID, providing a reason for the rejection.
        /// </summary>
        Task<bool> RejectReferenceAsync(Guid id, string reason);

        /// <summary>
        /// Creates a new genetic reference entry for the specified user asynchronously.
        /// </summary>
        Task<Guid> CreateReferenceAsync(Guid userId, string species, string name, string sequence);

        /// <summary>
        /// Updates the reference data for a specified user and reference identifier asynchronously.
        /// </summary>
        Task<bool> UpdateReferenceAsync(Guid userId, Guid id, string species, string name, string sequence);

        /// <summary>
        /// Asynchronously deletes a reference identified by the specified user and reference ID.
        /// </summary>
        Task<bool> DeleteReferenceAsync(Guid userId, Guid id);
    }
}
