using GenomiX.Infrastructure.Constants;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GenomiX.Infrastructure.Models
{
    /// <summary> A population of organisms simulated under given factors. </summary>
    [Comment("A population of organisms simulated under given environmental/selection factors.")]
    public class Population
    {
        /// <summary> Primary key (GUID). </summary>
        [Comment("Primary key (GUID).")]
        [Key]
        public Guid Id { get; set; }

        /// <summary> Human-friendly name for the run. </summary>
        [Comment("Human-friendly name for the run.")]
        [Required]
        [MaxLength(PopulationPropertyConstraints.Name_MaxLength)]
        public string Name { get; set; } = "";

        /// <summary> JSON with simulation factors (e.g., temperature, sunExposure, diseasePressure). </summary>
        [Comment("JSON with simulation factors (temperature, sunExposure, diseasePressure, ...).")]
        [Required]
        [MaxLength(PopulationPropertyConstraints.Factors_MaxLength)]
        public string Factors { get; set; } = "{}";

        /// <summary> Link to the base DNAModel used to derive this population. </summary>
        [Comment("Link to the base DNAModel used to derive this population.")]
        public Guid? BaseModelId { get; set; }

        /// <summary> Navigation property for DNA model table. </summary>
        public DNAModel? BaseModel { get; set; }

        /// <summary> User who created the population. </summary>
        [Comment("User who created the population.")]
        [ForeignKey(nameof(User))]
        public Guid? UserId { get; set; }

        /// <summary> UTC created timestamp. </summary>
        [Comment("UTC created timestamp.")]
        public DateTimeOffset CreatedAt { get; set; }

        /// <summary> Navigation property for organism table. </summary>
        public ICollection<Organism> Organisms { get; set; } = new List<Organism>();

        /// <summary> Navigation property for user table. </summary>
        public GenUser? User { get; set; }

        /// <summary> Whether this simulation is publicly visible to all users. </summary>
        [Comment("Whether this simulation is publicly visible to all users.")]
        public bool IsPublic { get; set; } = false;

        /// <summary> UTC timestamp when the simulation was published. </summary>
        [Comment("UTC timestamp when this simulation was published.")]
        public DateTimeOffset? PublishedAt { get; set; }
    }
}
