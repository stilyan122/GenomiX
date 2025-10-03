namespace GenomiX.Infrastructure.Repo
{
    /// <summary>
    /// Defines a generic repository interface for basic CRUD operations.
    /// </summary>
    /// <typeparam name="T">The entity type.</typeparam>
    public interface IRepository<T>
    {
        /// <summary>
        /// Retrieves all entities of type <typeparamref name="T"/>.
        /// </summary>
        /// <returns>The result contains a queryable of entities.</returns>
        IQueryable<T> GetAll();

        /// <summary>
        /// Retrieves an entity by its identifier.
        /// </summary>
        /// <param name="id">The identifier of the entity.</param>
        /// <returns>A task that represents the asynchronous operation. The task result contains the entity if found; otherwise, null.</returns>
        Task<T?> GetByIdAsync(object id);

        /// <summary>
        /// Adds a new entity to the repository.
        /// </summary>
        /// <param name="entity">The entity to add.</param>
        /// <returns>A task that represents the asynchronous operation.</returns>
        Task AddAsync(T entity);

        /// <summary>
        /// Updates an existing entity in the repository.
        /// </summary>
        /// <param name="entity">The entity to update.</param>
        /// <returns>A task that represents the asynchronous operation.</returns>
        Task UpdateAsync(T entity);

        /// <summary>
        /// Deletes an entity by its identifier.
        /// </summary>
        /// <param name="id">The identifier of the entity to delete.</param>
        /// <returns>A task that represents the asynchronous operation.</returns>
        Task DeleteAsync(object id);
    }
}
