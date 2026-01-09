using GenomiX.Infrastructure.Models;

namespace GenomiX.Core.Interfaces
{
    /// <summary>
    /// Defines CRUD operations and user-scoped queries for DNA models.
    /// </summary>
    public interface IDNAService
    {
        /// <summary>
        /// Retrieves all DNA models (admin/debug use). Prefer user-scoped methods in normal flows.
        /// </summary>
        Task<IEnumerable<DNAModel>> GetAllAsync();

        /// <summary>
        /// Retrieves a DNA model by its identifier (not user-scoped).
        /// </summary>
        Task<DNAModel?> GetByIdAsync(object id);

        /// <summary>
        /// Adds a new DNA model.
        /// </summary>
        Task AddAsync(DNAModel dna);

        /// <summary>
        /// Updates an existing DNA model.
        /// </summary>
        Task UpdateAsync(DNAModel dna);

        /// <summary>
        /// Deletes a DNA model by its identifier.
        /// </summary>
        Task DeleteAsync(object id);

        /// <summary>
        /// Retrieves all DNA models owned by a specific user.
        /// Used for "/dna/models" (My Models page).
        /// </summary>
        /// <param name="userId">The owner user's identifier.</param>
        /// <returns>All models for that user (typically ordered by UpdatedAt).</returns>
        Task<IReadOnlyList<DNAModel>> GetAllForUserAsync(Guid userId);

        /// <summary>
        /// Update all model sequences.
        /// </summary>
        Task UpdateModelSequencesAsync(Guid userId, Guid modelId, string s1, string s2);

        /// <summary>
        /// Retrieves one DNA model owned by a specific user, including its sequences.
        /// Used for "/dna/builder/{id}" to load the two strands.
        /// </summary>
        /// <param name="userId">The owner user's identifier.</param>
        /// <param name="modelId">The DNA model identifier.</param>
        /// <returns>The model with sequences if found and owned by the user; otherwise null.</returns>
        Task<DNAModel?> GetModelForUserWithSequencesAsync(Guid userId, Guid modelId);
    }
}
