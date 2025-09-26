using GenomiX.Infrastructure.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GenomiX.Infrastructure.Configurations
{
    /// <summary>
    /// DNA_Models_Diseases: many-to-many join.
    /// - Composite PK: (DNA_Model_Id, DiseaseId)
    /// - Cascade from both sides (safe since it's a pure join)
    /// </summary>
    public class DNAModelDiseaseConfiguration : IEntityTypeConfiguration<DNAModelDisease>
    {
        public void Configure(EntityTypeBuilder<DNAModelDisease> builder)
        {
        }
    }
}
