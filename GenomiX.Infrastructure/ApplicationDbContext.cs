using GenomiX.Infrastructure.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
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

        // Population & organisms
        public DbSet<Population> Populations => Set<Population>();
        public DbSet<Organism> Organisms => Set<Organism>();

        // Education
        public DbSet<Lesson> Lessons => Set<Lesson>();
        public DbSet<Test> Tests => Set<Test>();
        public DbSet<Answer> Answers => Set<Answer>();
        public DbSet<Question> Questions => Set<Question>();

        protected override void OnModelCreating(ModelBuilder builder)
        {
            builder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);

            base.OnModelCreating(builder);
        }
    }
}
