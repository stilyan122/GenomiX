using GenomiX.Infrastructure.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using System.Reflection.Emit;
namespace GenomiX.Infrastructure
{
    /// <summary>
    /// EF Core DbContext for GenomiX. Registers DbSets and applies entity configurations.
    /// </summary>
    public class ApplicationDbContext : IdentityDbContext<GenUser, IdentityRole<Guid>, Guid>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options) { }

        // Core genetics
        public DbSet<DNASequence> DNA_Sequences => Set<DNASequence>();
        public DbSet<ReferenceSequence> Reference_Sequences => Set<ReferenceSequence>();
        public DbSet<DNAModel> DNA_Models => Set<DNAModel>();
        public DbSet<DNAModelMutation> DNA_Model_Mutations => Set<DNAModelMutation>();
        public DbSet<Disease> Diseases => Set<Disease>();
        public DbSet<DNAModelDisease> DNA_Models_Diseases => Set<DNAModelDisease>();
        public DbSet<DiseaseMutationPattern> Disease_Mutation_Patterns => Set<DiseaseMutationPattern>();

        // Population & organisms
        public DbSet<Population> Populations => Set<Population>();
        public DbSet<Organism> Organisms => Set<Organism>();

        // Authentication & Authorization
        public DbSet<RoleRequest> RoleRequests { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            if (Environment.GetEnvironmentVariable("GENOMIX_SKIP_DB_CONFIG") == "1")
            {
                builder.Entity<DNAModel>()
                    .HasMany(m => m.Sequences)
                    .WithOne(s => s.Model)
                    .HasForeignKey(s => s.ModelId)
                    .OnDelete(DeleteBehavior.Cascade);

                return;
            }

            builder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);

            builder.Entity<DNAModel>()
                .HasMany(m => m.Sequences)
                .WithOne(s => s.Model)
                .HasForeignKey(s => s.ModelId)
                .OnDelete(DeleteBehavior.Cascade);

        }
    }
}
