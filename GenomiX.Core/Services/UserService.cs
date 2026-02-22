using GenomiX.Core.Interfaces;
using GenomiX.Core.Models;
using GenomiX.Infrastructure;
using GenomiX.Infrastructure.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace GenomiX.Core.Services
{
    /// <summary>
    /// Provides user and role management operations for administrative functionality, including retrieving users,
    /// managing role requests, and updating user roles.
    /// </summary>
    public class UserService : IUserService
    {
        private readonly ApplicationDbContext _db;
        private readonly UserManager<GenUser> _userManager;

        /// <summary>
        /// Initializes a new instance of the UserService class using the specified database context and user manager.
        /// </summary>
        public UserService(ApplicationDbContext db, UserManager<GenUser> userManager)
        {
            _db = db;
            _userManager = userManager;
        }

        /// <inheritdoc />
        public async Task<IReadOnlyList<AdminUserRow>> GetAllUsersAsync()
        {
            var users = await _db.Users
                .AsNoTracking()
                .OrderBy(u => u.UserName)
                .ToListAsync();

            var result = new List<AdminUserRow>(users.Count);

            foreach (var u in users)
            {
                var roles = await _userManager.GetRolesAsync(u);

                result.Add(new AdminUserRow
                {
                    UserId = u.Id,
                    UserName = u.FirstName + " " + u.LastName ?? "-",
                    Email = u.Email ?? "",
                    Roles = roles.OrderBy(r => r).ToList(),
                    DnaModels = 0,
                    Simulations = 0
                });
            }

            return result;
        }

        /// <inheritdoc />
        public async Task<IReadOnlyList<string>> GetRolesAsync(Guid userId)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return Array.Empty<string>();

            var roles = await _userManager.GetRolesAsync(user);
            return roles.OrderBy(r => r).ToList();
        }

        /// <inheritdoc />
        public async Task<IReadOnlyList<AdminRoleRequestRow>> GetRoleRequestsAsync(string? status = "")
        {
            var query = _db.RoleRequests
                .AsNoTracking()
                .Include(r => r.User)
                .OrderByDescending(r => r.CreatedAt)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(r => r.Status == status);

            var data = await query.ToListAsync();

            return data.Select(r => new AdminRoleRequestRow
            {
                Id = r.Id,
                UserId = r.UserId,
                UserName = r.User?.FirstName + " " + r.User?.LastName ?? "(unknown)",
                Email = r.User?.Email ?? "",
                RequestType = r.RequestType,
                RequestedRole = r.RequestedRole,
                Status = r.Status,
                Note = r.Note,
                CreatedAt = r.CreatedAt,
                DecidedAt = r.DecidedAt
            }).ToList();
        }

        /// <inheritdoc />
        public async Task ApproveRoleRequestAsync(int requestId)
        {
            var req = await _db.RoleRequests
                .Include(r => r.User)
                .FirstOrDefaultAsync(r => r.Id == requestId);

            if (req == null) throw new InvalidOperationException("Request not found.");
            if (req.Status != "Pending") return;

            var user = req.User;
            if (user == null) throw new InvalidOperationException("Request user not found.");

            if (req.RequestType == "Add")
            {
                if (!await _userManager.IsInRoleAsync(user, req.RequestedRole))
                {
                    var res = await _userManager.AddToRoleAsync(user, req.RequestedRole);
                    if (!res.Succeeded)
                        throw new InvalidOperationException(string.Join("; ", res.Errors.Select(e => e.Description)));
                }
            }
            else if (req.RequestType == "Remove")
            {
                if (await _userManager.IsInRoleAsync(user, req.RequestedRole))
                {
                    var res = await _userManager.RemoveFromRoleAsync(user, req.RequestedRole);
                    if (!res.Succeeded)
                        throw new InvalidOperationException(string.Join("; ", res.Errors.Select(e => e.Description)));
                }
            }
            else
            {
                throw new InvalidOperationException("Invalid request type.");
            }

            req.Status = "Approved";
            req.DecidedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
        }

        /// <inheritdoc />
        public async Task DeclineRoleRequestAsync(int requestId, string? reason = null)
        {
            var req = await _db.RoleRequests.FirstOrDefaultAsync(r => r.Id == requestId);
            if (req == null) throw new InvalidOperationException("Request not found.");
            if (req.Status != "Pending") return;

            req.Status = "Declined";
            req.DecidedAt = DateTime.UtcNow;

            if (!string.IsNullOrWhiteSpace(reason))
                req.Note = reason.Trim();

            await _db.SaveChangesAsync();
        }

        /// <inheritdoc />
        public async Task DeleteRoleRequestAsync(int requestId)
        {
            var req = await _db.RoleRequests.FirstOrDefaultAsync(r => r.Id == requestId);
            if (req == null) return;

            _db.RoleRequests.Remove(req);
            await _db.SaveChangesAsync();
        }

        /// <inheritdoc />
        public async Task<AdminUserRow?> GetUserByIdAsync(Guid userId)
        {
            var u = await _db.Users.FirstOrDefaultAsync(x => x.Id == userId);
            if (u == null) return null;

            var roles = await _userManager.GetRolesAsync(u);

            return new AdminUserRow
            {
                UserId = u.Id,
                UserName = u.FirstName + " " + u.LastName ?? "(no username)",
                Email = u.Email ?? "",
                Roles = roles.OrderBy(r => r).ToList(),
                DnaModels = 0,
                Simulations = 0
            };
        }

        /// <inheritdoc />
        public async Task<IReadOnlyList<AdminRoleRequestRow>> GetRoleRequestsForUserAsync(Guid userId)
        {
            var data = await _db.RoleRequests
                .AsNoTracking()
                .Include(r => r.User)
                .Where(r => r.UserId == userId)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return data.Select(r => new AdminRoleRequestRow
            {
                Id = r.Id,
                UserId = r.UserId,
                UserName = r.User?.FirstName + " " + r.User?.LastName ?? "(unknown)",
                Email = r.User?.Email ?? "",
                RequestType = r.RequestType,
                RequestedRole = r.RequestedRole,
                Status = r.Status,
                Note = r.Note,
                CreatedAt = r.CreatedAt,
                DecidedAt = r.DecidedAt
            }).ToList();
        }

        /// <inheritdoc />
        public async Task AddRoleAsync(Guid userId, string role)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) throw new InvalidOperationException("User not found.");

            role = (role ?? "").Trim();
            if (role.Length == 0) throw new InvalidOperationException("Role is required.");

            if (role.Equals("Admin", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("Admin role cannot be assigned manually here.");

            var has = await _userManager.IsInRoleAsync(user, role);
            if (has) return;

            var res = await _userManager.AddToRoleAsync(user, role);
            if (!res.Succeeded)
                throw new InvalidOperationException(string.Join("; ", res.Errors.Select(e => e.Description)));
        }

        /// <inheritdoc />
        public async Task RemoveRoleAsync(Guid userId, string role)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) throw new InvalidOperationException("User not found.");

            role = (role ?? "").Trim();
            if (role.Length == 0) throw new InvalidOperationException("Role is required.");

            if (role.Equals("Admin", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("Admin role cannot be removed here.");

            var has = await _userManager.IsInRoleAsync(user, role);
            if (!has) return;

            var res = await _userManager.RemoveFromRoleAsync(user, role);
            if (!res.Succeeded)
                throw new InvalidOperationException(string.Join("; ", res.Errors.Select(e => e.Description)));
        }
    }
}
