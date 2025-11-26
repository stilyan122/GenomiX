using GenomiX.Common.Extensions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GenomiX.Infrastructure.Configurations
{
    /// <summary>
    /// Seeds ASP.NET Core Identity roles from a JSON file.
    /// </summary>
    public class RoleConfiguration : IEntityTypeConfiguration<IdentityRole<Guid>>
    {
        public void Configure(EntityTypeBuilder<IdentityRole<Guid>> builder)
        {
            builder.SeedEntities("roles.json");
        }
    }
}
