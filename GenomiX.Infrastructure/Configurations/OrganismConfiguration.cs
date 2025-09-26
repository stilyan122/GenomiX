using GenomiX.Infrastructure.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GenomiX.Infrastructure.Configurations
{
    /// <summary>
    /// Organism: member of a population, with its own DNA snapshot.
    /// - Defaults: CreatedAt
    /// - FKs: DNA_Sequence (Restrict), Population (Cascade)
    /// - Index: (PopulationId, ScientificName)
    /// </summary> 
    public class OrganismConfiguration : IEntityTypeConfiguration<Organism>
    {
        public void Configure(EntityTypeBuilder<Organism> builder)
        {
           
        }
    }
}
