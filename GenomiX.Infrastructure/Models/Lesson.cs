using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GenomiX.Infrastructure.Models
{
    /// <summary> Lesson content metadata for the Education panel. </summary>
    [Comment("Lesson content for Education panel.")]
    public class Lesson
    {
        /// <summary> Primary key (GUID). </summary>
        [Comment("Primary key (GUID).")]
        [Key]
        public Guid Id { get; set; }

        /// <summary> Lesson title. </summary>
        [Comment("Lesson title.")]
        [Required]
        [MaxLength(Constants.LessonPropertyConstraints.Title_MaxLength)]
        public string Title { get; set; } = "";

        /// <summary> Topic, e.g., mutations, repair, probability. </summary>
        [Comment("Topic (mutations, repair, probability, ...).")]
        [Required]
        [MaxLength(Constants.LessonPropertyConstraints.Topic_MaxLength)]
        public string Topic { get; set; } = "";

        /// <summary> Markdown/HTML/plain content. </summary>
        [Comment("Markdown/HTML/plain content.")]
        [Required]
        [MaxLength(Constants.LessonPropertyConstraints.Information_MaxLength)]
        public string Information { get; set; } = "";

        /// <summary> User who created the lesson. </summary>
        [Comment("User who created the lesson.")]
        [ForeignKey(nameof(User))]
        public Guid? UserId { get; set; }

        /// <summary> Difficulty from 1 to 5. </summary>
        [Comment("Difficulty from 1 to 5.")]
        [Required]
        [Range(Constants.LessonPropertyConstraints.Difficulty_Min, Constants.LessonPropertyConstraints.Difficulty_Max)]
        public byte Difficulty { get; set; }

        /// <summary> Navigation property for tests table. </summary>
        public ICollection<Test> Tests { get; set; } = new List<Test>();

        /// <summary> Navigation property for user table. </summary>
        public GenUser? User { get; set; }
    }
}
