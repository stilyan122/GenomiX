using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GenomiX.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Initial_Migration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AspNetRoles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUsers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FirstName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    LastName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UserName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedUserName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedEmail = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    EmailConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SecurityStamp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhoneNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhoneNumberConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    TwoFactorEnabled = table.Column<bool>(type: "bit", nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LockoutEnabled = table.Column<bool>(type: "bit", nullable: false),
                    AccessFailedCount = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUsers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Diseases",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, comment: "Primary key (GUID)."),
                    Name = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false, comment: "Disease name."),
                    Description = table.Column<string>(type: "nvarchar(1024)", maxLength: 1024, nullable: false, comment: "Optional description or summary.")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Diseases", x => x.Id);
                },
                comment: "Catalog of known diseases.");

            migrationBuilder.CreateTable(
                name: "Reference_Sequences",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, comment: "Primary key (GUID)."),
                    Species = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false, comment: "Species or organism identifier for the reference sequence (e.g., Human, Mouse, Dog)."),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false, comment: "Descriptive name for the reference sequence (e.g., Beta-globin fragment)."),
                    Sequence = table.Column<string>(type: "nvarchar(max)", maxLength: 10000, nullable: false, comment: "Raw uppercase DNA string (A,C,G,T only)."),
                    Strand = table.Column<byte>(type: "tinyint", nullable: false, comment: "Strand index of the reference sequence (1 = forward, 2 = complementary)."),
                    PairIndex = table.Column<int>(type: "int", nullable: false, comment: "Pair index groups complementary strands together (e.g., 0 = initial pair)."),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, comment: "UTC timestamp when the reference sequence was created.")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Reference_Sequences", x => x.Id);
                },
                comment: "Reference DNA sequence template (e.g., Human, Mouse, Dog). Not tied to a user.");

            migrationBuilder.CreateTable(
                name: "AspNetRoleClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RoleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClaimType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ClaimValue = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoleClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetRoleClaims_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClaimType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ClaimValue = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUserClaims_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserLogins",
                columns: table => new
                {
                    LoginProvider = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    ProviderKey = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    ProviderDisplayName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserLogins", x => new { x.LoginProvider, x.ProviderKey });
                    table.ForeignKey(
                        name: "FK_AspNetUserLogins_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserRoles",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RoleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserTokens",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LoginProvider = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    Value = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserTokens", x => new { x.UserId, x.LoginProvider, x.Name });
                    table.ForeignKey(
                        name: "FK_AspNetUserTokens_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DNA_Models",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, comment: "Primary key (GUID)."),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true, comment: "Owner user (FK)."),
                    CurrentIndex = table.Column<int>(type: "int", nullable: false, comment: "Active timeline index (zero-based)."),
                    DisplayMode = table.Column<byte>(type: "tinyint", nullable: false, comment: "0 = Basic shapes, 1 = Scientific atomic view."),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, comment: "UTC created timestamp."),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, comment: "UTC updated timestamp.")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DNA_Models", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DNA_Models_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                },
                comment: "Editable DNA model holding references to two strand snapshots (double-helix).");

            migrationBuilder.CreateTable(
                name: "Lessons",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, comment: "Primary key (GUID)."),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false, comment: "Lesson title."),
                    Topic = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false, comment: "Topic (mutations, repair, probability, ...)."),
                    Information = table.Column<string>(type: "nvarchar(max)", maxLength: 8000, nullable: false, comment: "Markdown/HTML/plain content."),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true, comment: "User who created the lesson."),
                    Difficulty = table.Column<byte>(type: "tinyint", nullable: false, comment: "Difficulty from 1 to 5.")
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
                name: "Populations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, comment: "Primary key (GUID)."),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false, comment: "Human-friendly name for the run."),
                    Factors = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false, comment: "JSON with simulation factors (temperature, sunExposure, diseasePressure, ...)."),
                    BaseModelId = table.Column<Guid>(type: "uniqueidentifier", nullable: true, comment: "Optional link to the base DNAModel used to derive this population."),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true, comment: "User who created the population."),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, comment: "UTC created timestamp.")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Populations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Populations_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                },
                comment: "A population of organisms simulated under given environmental/selection factors.");

            migrationBuilder.CreateTable(
                name: "DNA_Model_Mutations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, comment: "Primary key (GUID)."),
                    ModelId = table.Column<Guid>(type: "uniqueidentifier", nullable: true, comment: "FK to DNAModel."),
                    Type = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false, comment: "Type of mutation: substitution | insertion | deletion."),
                    PosStart = table.Column<int>(type: "int", nullable: false, comment: "1-based inclusive start position in the strand."),
                    PosEnd = table.Column<int>(type: "int", nullable: false, comment: "1-based inclusive end position in the strand (>= PosStart)."),
                    Ref = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false, comment: "Reference bases being replaced/removed ('' allowed for insertion)."),
                    Alt = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false, comment: "Alternate bases inserted/replacing ref ('' allowed for deletion)."),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, comment: "UTC timestamp of the mutation record.")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DNA_Model_Mutations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DNA_Model_Mutations_DNA_Models_ModelId",
                        column: x => x.ModelId,
                        principalTable: "DNA_Models",
                        principalColumn: "Id");
                },
                comment: "Atomic edit to a DNAModel (substitution|insertion|deletion).");

            migrationBuilder.CreateTable(
                name: "DNA_Models_Diseases",
                columns: table => new
                {
                    DNA_Model_Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, comment: "FK to DNAModel."),
                    DiseaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, comment: "FK to Disease."),
                    DNAModelId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DNA_Models_Diseases", x => new { x.DNA_Model_Id, x.DiseaseId });
                    table.ForeignKey(
                        name: "FK_DNA_Models_Diseases_DNA_Models_DNAModelId",
                        column: x => x.DNAModelId,
                        principalTable: "DNA_Models",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_DNA_Models_Diseases_Diseases_DiseaseId",
                        column: x => x.DiseaseId,
                        principalTable: "Diseases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                },
                comment: "Many-to-many link between DNA models and diseases.");

            migrationBuilder.CreateTable(
                name: "DNA_Sequences",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, comment: "Primary key (GUID)."),
                    ModelId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, comment: "Owning DNAModel (FK)."),
                    Sequence = table.Column<string>(type: "nvarchar(max)", maxLength: 10000, nullable: false, comment: "Raw uppercase DNA string (A,C,G,T only)."),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, comment: "UTC timestamp when the snapshot was created.")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DNA_Sequences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DNA_Sequences_DNA_Models_ModelId",
                        column: x => x.ModelId,
                        principalTable: "DNA_Models",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                },
                comment: "Immutable snapshot of a DNA sequence (A/C/G/T only).");

            migrationBuilder.CreateTable(
                name: "Tests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, comment: "Primary key (GUID)."),
                    LessonId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, comment: "FK to Lesson."),
                    Type = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false, comment: "Question type: mcq | multi | open."),
                    Question = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false, comment: "The question text/prompt.")
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
                name: "Organisms",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, comment: "Primary key (GUID)."),
                    SimpleName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false, comment: "Simple/UI name."),
                    ScientificName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false, comment: "Scientific-like identifier."),
                    DNA_Sequence_Id = table.Column<Guid>(type: "uniqueidentifier", nullable: true, comment: "FK to a DNA strand snapshot (for this organism)."),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false, comment: "Optional description."),
                    PopulationId = table.Column<Guid>(type: "uniqueidentifier", nullable: true, comment: "FK to Population."),
                    SurvivalScore = table.Column<double>(type: "float", nullable: true, comment: "Continuous survival/fitness score (nullable)."),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false, comment: "Status: alive | dead | reproduced."),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, comment: "UTC created timestamp.")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Organisms", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Organisms_DNA_Sequences_DNA_Sequence_Id",
                        column: x => x.DNA_Sequence_Id,
                        principalTable: "DNA_Sequences",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Organisms_Populations_PopulationId",
                        column: x => x.PopulationId,
                        principalTable: "Populations",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Questions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, comment: "Primary key (GUID)."),
                    TestId = table.Column<Guid>(type: "uniqueidentifier", nullable: true, comment: "FK to Test."),
                    Prompt = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false, comment: "The question text/prompt."),
                    Explanation = table.Column<string>(type: "nvarchar(1024)", maxLength: 1024, nullable: true, comment: "Optional explanation or hint for the question.")
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
                    Value = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false, comment: "Answer text/value."),
                    IsCorrect = table.Column<bool>(type: "bit", nullable: false, comment: "Indicates whether the answer is correct.")
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

            migrationBuilder.CreateIndex(
                name: "IX_Answers_QuestionId",
                table: "Answers",
                column: "QuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetRoleClaims_RoleId",
                table: "AspNetRoleClaims",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                table: "AspNetRoles",
                column: "NormalizedName",
                unique: true,
                filter: "[NormalizedName] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserClaims_UserId",
                table: "AspNetUserClaims",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserLogins_UserId",
                table: "AspNetUserLogins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserRoles_RoleId",
                table: "AspNetUserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "AspNetUsers",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "AspNetUsers",
                column: "NormalizedUserName",
                unique: true,
                filter: "[NormalizedUserName] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_DNA_Model_Mutations_ModelId",
                table: "DNA_Model_Mutations",
                column: "ModelId");

            migrationBuilder.CreateIndex(
                name: "IX_DNA_Models_UserId",
                table: "DNA_Models",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_DNA_Models_Diseases_DiseaseId",
                table: "DNA_Models_Diseases",
                column: "DiseaseId");

            migrationBuilder.CreateIndex(
                name: "IX_DNA_Models_Diseases_DNAModelId",
                table: "DNA_Models_Diseases",
                column: "DNAModelId");

            migrationBuilder.CreateIndex(
                name: "IX_DNA_Sequences_ModelId",
                table: "DNA_Sequences",
                column: "ModelId");

            migrationBuilder.CreateIndex(
                name: "IX_Lessons_UserId",
                table: "Lessons",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Organisms_DNA_Sequence_Id",
                table: "Organisms",
                column: "DNA_Sequence_Id");

            migrationBuilder.CreateIndex(
                name: "IX_Organisms_PopulationId",
                table: "Organisms",
                column: "PopulationId");

            migrationBuilder.CreateIndex(
                name: "IX_Populations_UserId",
                table: "Populations",
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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Answers");

            migrationBuilder.DropTable(
                name: "AspNetRoleClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserLogins");

            migrationBuilder.DropTable(
                name: "AspNetUserRoles");

            migrationBuilder.DropTable(
                name: "AspNetUserTokens");

            migrationBuilder.DropTable(
                name: "DNA_Model_Mutations");

            migrationBuilder.DropTable(
                name: "DNA_Models_Diseases");

            migrationBuilder.DropTable(
                name: "Organisms");

            migrationBuilder.DropTable(
                name: "Reference_Sequences");

            migrationBuilder.DropTable(
                name: "Questions");

            migrationBuilder.DropTable(
                name: "AspNetRoles");

            migrationBuilder.DropTable(
                name: "Diseases");

            migrationBuilder.DropTable(
                name: "DNA_Sequences");

            migrationBuilder.DropTable(
                name: "Populations");

            migrationBuilder.DropTable(
                name: "Tests");

            migrationBuilder.DropTable(
                name: "DNA_Models");

            migrationBuilder.DropTable(
                name: "Lessons");

            migrationBuilder.DropTable(
                name: "AspNetUsers");
        }
    }
}
