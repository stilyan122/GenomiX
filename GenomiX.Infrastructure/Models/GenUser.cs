using GenomiX.Infrastructure.Constants;
using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;

namespace GenomiX.Infrastructure.Models
{
    /// <summary>
    /// Represents an application user with additional profile information.
    /// Inherits from <see cref="IdentityUser"/> to integrate with ASP.NET Core Identity.
    /// </summary>
    public class GenUser : IdentityUser<Guid>
    {
        /// <summary> Primary key (GUID). </summary>
        [Key]
        public override Guid Id { get; set; }

        /// <summary> Gets or sets the user's first name. </summary>
        [Required]
        [MaxLength(GenUserPropertyConstraints.FirstName_MaxLength)]
        public string FirstName { get; set; } = null!;

        /// <summary> Gets or sets the user's last name.</summary>
        [Required]
        [MaxLength(GenUserPropertyConstraints.LastName_MaxLength)]
        public string LastName { get; set; } = null!;

        /// <summary> Gets or sets the date and time when the user was created. </summary>
        public DateTime CreatedAt { get; set; }

        /// <summary> Gets or sets the collection of populations associated with this entity. </summary>
        public ICollection<Population> Populations { get; set; } = new List<Population>();

        /// <summary> Gets or sets the collection of lessons associated with this entity. </summary>
        public ICollection<Lesson> Lessons { get; set; } = new List<Lesson>();

        /// <summary> Gets or sets the collection of DNA models associated with this entity. </summary>
        public ICollection<DNAModel> DNAModels { get; set; } = new List<DNAModel>();
    }
}
