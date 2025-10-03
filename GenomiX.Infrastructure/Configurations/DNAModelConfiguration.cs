using GenomiX.Common.Extensions;
using GenomiX.Infrastructure.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GenomiX.Infrastructure.Configurations
{
    /// <summary>
    /// DNA_Models: double-helix via two strands (start/current/last).
    /// - CHECK: DisplayMode in [0;1]
    /// - FKs: all strand references Restrict delete (preserve history)
    /// - Indexes: UserId, UpdatedAt
    /// - Defaults: CreatedAt/UpdatedAt = SYSUTCDATETIME()
    /// </summary>
    public class DNAModelConfiguration : IEntityTypeConfiguration<DNAModel>
    {
        public void Configure(EntityTypeBuilder<DNAModel> builder)
        {
            builder.SeedEntities("models.json");
        }
    }
}
