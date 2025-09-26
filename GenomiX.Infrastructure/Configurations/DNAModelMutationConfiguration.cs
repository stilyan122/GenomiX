using GenomiX.Infrastructure.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GenomiX.Infrastructure.Configurations
{
    /// <summary>
    /// DNA_Model_Mutations: atomic edit log.
    /// - CHECK: Type ∈ {substitution,insertion,deletion}
    /// - CHECK: positions valid (PosStart >=1, PosEnd >= PosStart)
    /// - Defaults: CreatedAt
    /// - Index: (ModelId, PosStart) to fetch mutations by position quickly
    /// </summary>
    public class DNAModelMutationConfiguration : IEntityTypeConfiguration<DNAModelMutation>
    {
        public void Configure(EntityTypeBuilder<DNAModelMutation> builder)
        {
           
        }
    }
}
