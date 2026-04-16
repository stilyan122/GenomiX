using GenomiX.Common.Extensions;
using GenomiX.Infrastructure.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GenomiX.Infrastructure.Configurations
{
    public class OrganismConfiguration : IEntityTypeConfiguration<Organism>
    {
        public void Configure(EntityTypeBuilder<Organism> builder)
        {
           builder.SeedEntities("organisms.json");
        }
    }
}
