using GenomiX.Infrastructure.Models;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

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

            await Set(um, "stilyan", "Admin.123");
            await Set(um, "alice", "Student.123");
            await Set(um, "ivan", "Student.123");
            await Set(um, "maria.teacher", "Teacher.123");
            await Set(um, "georgi.scientist", "Scientist.123");
        }

        private static async Task Set(UserManager<GenUser> um, string userName, string password)
        {
            var user = await um.FindByNameAsync(userName);

            if (user is null) 
                return;

            if (await um.HasPasswordAsync(user))
                await um.RemovePasswordAsync(user);

            var result = await um.AddPasswordAsync(user, password);

            if (!result.Succeeded)
            {
                var hasher = new PasswordHasher<GenUser>();
                user.PasswordHash = hasher.HashPassword(user, password);
                await um.UpdateAsync(user);
            }
        }
    }
}
