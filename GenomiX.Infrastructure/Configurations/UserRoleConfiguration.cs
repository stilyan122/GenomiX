using GenomiX.Common.Extensions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GenomiX.Infrastructure.Configurations
{
    /// <summary>
    /// Seeds user-role mappings from a JSON file.
    /// </summary>
    public class UserRoleConfiguration : IEntityTypeConfiguration<IdentityUserRole<Guid>>
    {
        public void Configure(EntityTypeBuilder<IdentityUserRole<Guid>> builder)
        {
            builder.SeedEntities("users-roles.json");
        }
    }
}
