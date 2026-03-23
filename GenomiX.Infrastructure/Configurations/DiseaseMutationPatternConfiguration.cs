using GenomiX.Common.Extensions;
using GenomiX.Infrastructure.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GenomiX.Infrastructure.Configurations
{
    public class DiseaseMutationPatternConfiguration : IEntityTypeConfiguration<DiseaseMutationPattern>
    {
        public void Configure(EntityTypeBuilder<DiseaseMutationPattern> builder)
        {
            builder.SeedEntities("patterns.json");
        }
    }
}
