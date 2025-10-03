using GenomiX.Common.Extensions;
using GenomiX.Infrastructure.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GenomiX.Infrastructure.Configurations
{
    /// <summary>
    /// Population: simulation run with factors JSON.
    /// - Defaults: CreatedAt
    /// - FKs: BaseModel (SetNull), CreatedBy (index)
    /// </summary> 
    public class PopulationConfiguration : IEntityTypeConfiguration<Population>
    {
        public void Configure(EntityTypeBuilder<Population> builder)
        {
            builder.SeedEntities("populations.json");
        }
    }
}
