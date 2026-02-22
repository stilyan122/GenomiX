using GenomiX.Core.Models;

namespace GenomiX.Core.Interfaces
{
    public interface IUserService
    {
        /// <summary>
        /// Asynchronously retrieves a read-only list of all administrative users.
        /// </summary>
        Task<IReadOnlyList<AdminUserRow>> GetAllUsersAsync();

        /// <summary>
        /// Retrieves a list of administrative role requests filtered by their status.
        /// </summary>
        Task<IReadOnlyList<AdminRoleRequestRow>> GetRoleRequestsAsync(string? status = "Pending");

        /// <summary>
        /// Approves a pending role request identified by the specified request ID.
        /// </summary>
        Task ApproveRoleRequestAsync(int requestId);

        /// <summary>
        /// Declines a pending role request identified by the specified request ID.
        /// </summary>
        Task DeclineRoleRequestAsync(int requestId, string? reason = null);

        /// <summary>
        /// Deletes a pending role request identified by the specified request ID asynchronously.
        /// </summary>
        Task DeleteRoleRequestAsync(int requestId); 

        /// <summary>
        /// Asynchronously retrieves the list of role names assigned to the specified user.
        /// </summary>
        Task<IReadOnlyList<string>> GetRolesAsync(Guid userId);

        /// <summary>
        /// Asynchronously retrieves the user record associated with the specified user identifier.
        /// </summary>
        Task<AdminUserRow?> GetUserByIdAsync(Guid userId);

        /// <summary>
        /// Retrieves all administrative role requests associated with the specified user.
        /// </summary>
        Task<IReadOnlyList<AdminRoleRequestRow>> GetRoleRequestsForUserAsync(Guid userId);

        /// <summary>
        /// Asynchronously assigns the specified role to the user identified by the given user ID.
        /// </summary>
        Task AddRoleAsync(Guid userId, string role);

        /// <summary>
        /// Removes the specified role from the user with the given identifier asynchronously.
        /// </summary>
        Task RemoveRoleAsync(Guid userId, string role);
    }
}
