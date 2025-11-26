using GenomiX.Common.Extensions;
using GenomiX.Infrastructure.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GenomiX.Infrastructure.Configurations
{
    /// <summary>
    /// Seeds application users (GenUser) from a JSON file.
    /// </summary>
    public class GenUserConfiguration : IEntityTypeConfiguration<GenUser>
    {
        public void Configure(EntityTypeBuilder<GenUser> builder)
        {
            builder.SeedEntities("users.json");
        }
    }
}
