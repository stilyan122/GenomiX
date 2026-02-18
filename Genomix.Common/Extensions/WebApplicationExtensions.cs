using GenomiX.Infrastructure.Models;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace Genomix.Common.Extensions
{
    /// <summary>
    /// Helper to force known dev passwords for seeded users (and other web app extensions).
    /// </summary>
    public static class WebApplicationExtensions
    {
        public static async Task UseKnownIdentityPasswordsAsync(this WebApplication app)
        {
            using var scope = app.Services.CreateScope();
            var um = scope.ServiceProvider.GetRequiredService<UserManager<GenUser>>();
            var hasher = new PasswordHasher<GenUser>();

            await Force(um, hasher, "stilyan", "Admin!123");
            await Force(um, hasher, "alice", "User!123");
            await Force(um, hasher, "ivan", "User!123");
            await Force(um, hasher, "georgi.scientist", "Scientist!123");

            await Verify(um, "stilyan", "Admin!123");
            await Verify(um, "alice", "User!123");
            await Verify(um, "ivan", "User!123");
            await Verify(um, "georgi.scientist", "Scientist!123");
        }

        private static async Task Force(UserManager<GenUser> um, PasswordHasher<GenUser> hasher,
                                        string userName, string rawPassword)
        {
            var user = await um.FindByNameAsync(userName);
            if (user is null) return;

            user.PasswordHash = hasher.HashPassword(user, rawPassword);
            user.SecurityStamp = Guid.NewGuid().ToString();
            user.EmailConfirmed = true;

            await um.UpdateAsync(user);
        }

        private static async Task Verify(UserManager<GenUser> um, string userName, string rawPassword)
        {
            var u = await um.FindByNameAsync(userName);
            var ok = u != null && await um.CheckPasswordAsync(u, rawPassword);
        }
    }
}
