using GenomiX.Core.Models;
using GenomiX.Infrastructure.Models;

namespace GenomiX.Core.Interfaces
{
    public interface ISimulationService
    {
        /// <summary>
        /// Asynchronously retrieves all population records associated with the specified user.
        /// </summary>
        /// <param name="userId">The unique identifier of the user whose population records are to be retrieved.</param>
        Task<IReadOnlyList<Population>> GetAllForUserAsync(Guid userId);

        /// <summary>
        /// Asynchronously retrieves the specified population associated with a given user.
        /// </summary>
        /// <param name="userId">The unique identifier of the user whose population is to be retrieved.</param>
        /// <param name="populationId">The unique identifier of the population to retrieve for the specified user.</param>
        Task<Population?> GetForUserAsync(Guid userId, Guid populationId);

        /// <summary>
        /// Asynchronously creates a new simulation instance with the specified parameters.
        /// </summary>
        /// <param name="userId">The unique identifier of the user who owns the simulation.</param>
        /// <param name="name">The name to assign to the new simulation. Cannot be null or empty.</param>
        /// <param name="baseModelId">The unique identifier of the base model to use for the simulation.</param>
        /// <param name="size">The size of the simulation. Must be a positive integer.</param>
        /// <param name="species">The species to associate with the simulation.</param>
        /// <param name="factors">The simulation factors to apply when creating the simulation. Cannot be null.</param>
        Task<Guid> CreateAsync(Guid userId, string name, Guid baseModelId, int size, string species, SimFactors factors);

        /// <summary>
        /// Asynchronously updates the simulation factors for the specified user and population.
        /// </summary>
        /// <param name="userId">The unique identifier of the user whose factors are to be updated.</param>
        /// <param name="populationId">The unique identifier of the population associated with the factors.</param>
        /// <param name="newFactors">The new set of simulation factors to apply for the user and population.</param>
        Task UpdateFactorsAsync(Guid userId, Guid populationId, SimFactors newFactors);

        /// <summary>
        /// Advances the simulation for the specified user and population by the given number of steps asynchronously.
        /// </summary>
        /// <param name="userId">The unique identifier of the user whose simulation state will be updated.</param>
        /// <param name="populationId">The unique identifier of the population to simulate.</param>
        /// <param name="steps">The number of simulation steps to advance. Must be greater than zero. The default is 1.</param>
        Task<SimTickResult> TickAsync(Guid userId, Guid populationId, int steps = 1);

        /// <summary>
        /// Asynchronously sets the running state for the specified user and population.
        /// </summary>
        /// <param name="userId">The unique identifier of the user whose running state is to be updated.</param>
        /// <param name="populationId">The unique identifier of the population associated with the user.</param>
        /// <param name="isRunning">A value indicating whether the user is running. Specify <see langword="true"/> to set the user as running;
        Task SetRunningAsync(Guid userId, Guid populationId, bool isRunning);

        /// <summary>
        /// Asynchronously renames the specified population for the given user.
        /// </summary>
        /// <param name="userId">The unique identifier of the user who owns the population.</param>
        /// <param name="populationId">The unique identifier of the population to rename.</param>
        /// <param name="name">The new name to assign to the population. Cannot be null or empty.</param>
        Task RenameAsync(Guid userId, Guid populationId, string name);

        /// <summary>
        /// Asynchronously deletes the specified population for the given user.
        /// </summary>
        /// <param name="userId">The unique identifier of the user for whom the population will be deleted.</param>
        /// <param name="populationId">The unique identifier of the population to delete.</param>
        Task DeleteForUserAsync(Guid userId, Guid populationId);

        /// <summary>Saves current organism states to the database.</summary>
        Task SaveStateAsync(Guid userId, Guid populationId, List<(Guid id, string status, double fitness)> organisms);

        /// <summary>Publishes a simulation to the public gallery (Scientist/Admin only).</summary>
        Task<bool> PublishAsync(Guid userId, Guid populationId);

        /// <summary>Removes a simulation from the public gallery.</summary>
        Task<bool> UnpublishAsync(Guid userId, Guid populationId);

        /// <summary>Returns all publicly published simulations.</summary>
        Task<IReadOnlyList<Population>> GetPublicAsync();

        /// <summary>Get population by id.</summary>
        Task<Population> GetByIdAsync(Guid id);
    }
}