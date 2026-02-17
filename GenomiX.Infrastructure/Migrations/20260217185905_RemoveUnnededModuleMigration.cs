using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace GenomiX.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveUnnededModuleMigration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Answers");

            migrationBuilder.DropTable(
                name: "Questions");

            migrationBuilder.DropTable(
                name: "Tests");

            migrationBuilder.DropTable(
                name: "Lessons");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Lessons",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, comment: "Primary key (GUID)."),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true, comment: "User who created the lesson."),
                    Difficulty = table.Column<byte>(type: "tinyint", nullable: false, comment: "Difficulty from 1 to 5."),
                    Information = table.Column<string>(type: "nvarchar(max)", maxLength: 8000, nullable: false, comment: "Markdown/HTML/plain content."),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false, comment: "Lesson title."),
                    Topic = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false, comment: "Topic (mutations, repair, probability, ...).")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Lessons", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Lessons_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                },
                comment: "Lesson content for Education panel.");

            migrationBuilder.CreateTable(
                name: "Tests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, comment: "Primary key (GUID)."),
                    LessonId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, comment: "FK to Lesson."),
                    Title = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false, comment: "The title text.")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Tests_Lessons_LessonId",
                        column: x => x.LessonId,
                        principalTable: "Lessons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                },
                comment: "Test/quiz question associated with a Lesson.");

            migrationBuilder.CreateTable(
                name: "Questions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, comment: "Primary key (GUID)."),
                    TestId = table.Column<Guid>(type: "uniqueidentifier", nullable: true, comment: "FK to Test."),
                    Explanation = table.Column<string>(type: "nvarchar(1024)", maxLength: 1024, nullable: true, comment: "Optional explanation or hint for the question."),
                    Prompt = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false, comment: "The question text/prompt."),
                    Type = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false, comment: "Question type: mcq | multi | open.")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Questions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Questions_Tests_TestId",
                        column: x => x.TestId,
                        principalTable: "Tests",
                        principalColumn: "Id");
                },
                comment: "Question belonging to a Test, with prompt and possible answers.");

            migrationBuilder.CreateTable(
                name: "Answers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, comment: "Primary key (GUID)."),
                    QuestionId = table.Column<Guid>(type: "uniqueidentifier", nullable: true, comment: "FK to Question."),
                    IsCorrect = table.Column<bool>(type: "bit", nullable: false, comment: "Indicates whether the answer is correct."),
                    Value = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false, comment: "Answer text/value.")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Answers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Answers_Questions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "Questions",
                        principalColumn: "Id");
                },
                comment: "Answer option for a Test, with correctness flag.");

            migrationBuilder.InsertData(
                table: "Lessons",
                columns: new[] { "Id", "Difficulty", "Information", "Title", "Topic", "UserId" },
                values: new object[,]
                {
                    { new Guid("aaaa1111-aaaa-1111-aaaa-aaaaaaaaaaaa"), (byte)1, "DNA (Deoxyribonucleic acid) is a double helix composed of nucleotides: adenine (A), cytosine (C), guanine (G), and thymine (T). A pairs with T, and C pairs with G.", "DNA Structure Basics", "DNA", new Guid("a7f9a7d5-56f5-4f3f-8a9f-8c2f0d3d7001") },
                    { new Guid("bbbb2222-bbbb-2222-bbbb-bbbbbbbbbbbb"), (byte)2, "Mutations are changes in DNA. **Substitution** replaces one base, **insertion** adds bases, and **deletion** removes bases. Mutations can be harmful, neutral, or beneficial.", "Types of Mutations", "Mutations", new Guid("a7f9a7d5-56f5-4f3f-8a9f-8c2f0d3d7001") },
                    { new Guid("cccc3333-cccc-3333-cccc-cccccccccccc"), (byte)3, "Cells use repair mechanisms to fix DNA damage. Examples include mismatch repair, nucleotide excision repair, and double-strand break repair. Nanobot simulation in GenomiX demonstrates these concepts.", "DNA Repair Mechanisms", "Repair", new Guid("a7f9a7d5-56f5-4f3f-8a9f-8c2f0d3d7001") },
                    { new Guid("dddd4444-dddd-4444-dddd-dddddddddddd"), (byte)2, "Probability is key in genetics. For example, Punnett squares can predict the likelihood of offspring inheriting traits. The law of independent assortment applies.", "Probability in Genetics", "Probability", new Guid("a7f9a7d5-56f5-4f3f-8a9f-8c2f0d3d7001") },
                    { new Guid("eeee5555-eeee-5555-eeee-eeeeeeeeeeee"), (byte)4, "Populations evolve through natural selection, genetic drift, and gene flow. Environmental factors such as temperature or disease pressure influence survival.", "Population Evolution", "Evolution", new Guid("a7f9a7d5-56f5-4f3f-8a9f-8c2f0d3d7001") }
                });

            migrationBuilder.InsertData(
                table: "Tests",
                columns: new[] { "Id", "LessonId", "Title" },
                values: new object[,]
                {
                    { new Guid("aaaa1111-aaaa-2222-aaaa-aaaaaaaaaaaa"), new Guid("aaaa1111-aaaa-1111-aaaa-aaaaaaaaaaaa"), "Quiz: DNA Structure" },
                    { new Guid("bbbb2222-bbbb-3333-bbbb-bbbbbbbbbbbb"), new Guid("bbbb2222-bbbb-2222-bbbb-bbbbbbbbbbbb"), "Quiz: Mutation Types" },
                    { new Guid("cccc3333-cccc-4444-cccc-cccccccccccc"), new Guid("cccc3333-cccc-3333-cccc-cccccccccccc"), "Quiz: DNA Repair" },
                    { new Guid("dddd4444-dddd-5555-dddd-dddddddddddd"), new Guid("dddd4444-dddd-4444-dddd-dddddddddddd"), "Quiz: Probability" },
                    { new Guid("eeee5555-eeee-6666-eeee-eeeeeeeeeeee"), new Guid("eeee5555-eeee-5555-eeee-eeeeeeeeeeee"), "Quiz: Population Evolution" }
                });

            migrationBuilder.InsertData(
                table: "Questions",
                columns: new[] { "Id", "Explanation", "Prompt", "TestId", "Type" },
                values: new object[,]
                {
                    { new Guid("00000000-eeee-bbbb-eeee-eeeeeeeeeeee"), "Consider disease, climate, and mutation.", "Select all factors that influence population survival.", new Guid("eeee5555-eeee-6666-eeee-eeeeeeeeeeee"), "multi" },
                    { new Guid("11111111-aaaa-2222-aaaa-aaaaaaaaaaaa"), "Remember A pairs with T, and C pairs with G.", "Which bases pair together in DNA?", new Guid("aaaa1111-aaaa-2222-aaaa-aaaaaaaaaaaa"), "mcq" },
                    { new Guid("22222222-aaaa-3333-aaaa-aaaaaaaaaaaa"), "Think about the double structure.", "What shape does the DNA molecule form?", new Guid("aaaa1111-aaaa-2222-aaaa-aaaaaaaaaaaa"), "open" },
                    { new Guid("33333333-bbbb-4444-bbbb-bbbbbbbbbbbb"), null, "Which of the following is a substitution mutation?", new Guid("bbbb2222-bbbb-3333-bbbb-bbbbbbbbbbbb"), "mcq" },
                    { new Guid("44444444-bbbb-5555-bbbb-bbbbbbbbbbbb"), "There are more than one correct answers.", "Select all types of mutations.", new Guid("bbbb2222-bbbb-3333-bbbb-bbbbbbbbbbbb"), "multi" },
                    { new Guid("55555555-cccc-6666-cccc-cccccccccccc"), "Think about DNA polymerase and ligase.", "What enzyme is responsible for DNA repair?", new Guid("cccc3333-cccc-4444-cccc-cccccccccccc"), "mcq" },
                    { new Guid("66666666-cccc-7777-cccc-cccccccccccc"), "Short answer expected.", "Describe one method of DNA repair.", new Guid("cccc3333-cccc-4444-cccc-cccccccccccc"), "open" },
                    { new Guid("77777777-dddd-8888-dddd-dddddddddddd"), null, "If a trait has a probability of 25%, how many individuals out of 200 are expected to show it?", new Guid("dddd4444-dddd-5555-dddd-dddddddddddd"), "mcq" },
                    { new Guid("88888888-dddd-9999-dddd-dddddddddddd"), "Link probability rules to Punnett squares.", "Explain how probability affects inheritance in genetics.", new Guid("dddd4444-dddd-5555-dddd-dddddddddddd"), "open" },
                    { new Guid("99999999-eeee-aaaa-eeee-eeeeeeeeeeee"), "Think about recombination and mutation.", "Which factor increases genetic diversity in a population?", new Guid("eeee5555-eeee-6666-eeee-eeeeeeeeeeee"), "mcq" }
                });

            migrationBuilder.InsertData(
                table: "Answers",
                columns: new[] { "Id", "IsCorrect", "QuestionId", "Value" },
                values: new object[,]
                {
                    { new Guid("14d6cb7b-44fa-40a6-a76f-657e7b9e8f95"), true, new Guid("99999999-eeee-aaaa-eeee-eeeeeeeeeeee"), "Mutation" },
                    { new Guid("1a5f8449-62a3-42e6-97e3-7c30c676890a"), false, new Guid("77777777-dddd-8888-dddd-dddddddddddd"), "25" },
                    { new Guid("26f84cf2-b33a-46f8-b1df-10f0c50bb979"), false, new Guid("99999999-eeee-aaaa-eeee-eeeeeeeeeeee"), "Uniform environment" },
                    { new Guid("2d1c707f-43e9-43c2-8f20-dfb6c4140b1e"), true, new Guid("55555555-cccc-6666-cccc-cccccccccccc"), "DNA ligase" },
                    { new Guid("3d78217b-fb4a-4f64-80d1-1b9f408a64b2"), false, new Guid("33333333-bbbb-4444-bbbb-bbbbbbbbbbbb"), "Removing a whole codon" },
                    { new Guid("5b0c8cd4-9c26-46f0-94df-c36876ad6bc9"), true, new Guid("77777777-dddd-8888-dddd-dddddddddddd"), "50" },
                    { new Guid("6a2f6f03-8a56-4a87-a2b9-33fc60a1b10f"), true, new Guid("33333333-bbbb-4444-bbbb-bbbbbbbbbbbb"), "Changing a single base from A to G" },
                    { new Guid("b4f2f8a9-2a0a-4f67-9b2e-b7ac32af6242"), true, new Guid("11111111-aaaa-2222-aaaa-aaaaaaaaaaaa"), "A pairs with T, C pairs with G" },
                    { new Guid("b69d2b41-8f21-47f6-9436-d2fc0e2c23b6"), false, new Guid("55555555-cccc-6666-cccc-cccccccccccc"), "Amylase" },
                    { new Guid("c5e7c6e1-1bfc-4f7d-9f2a-8d2c6e0e8d9c"), false, new Guid("11111111-aaaa-2222-aaaa-aaaaaaaaaaaa"), "A pairs with G, C pairs with T" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Answers_QuestionId",
                table: "Answers",
                column: "QuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_Lessons_UserId",
                table: "Lessons",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Questions_TestId",
                table: "Questions",
                column: "TestId");

            migrationBuilder.CreateIndex(
                name: "IX_Tests_LessonId",
                table: "Tests",
                column: "LessonId");
        }
    }
}
