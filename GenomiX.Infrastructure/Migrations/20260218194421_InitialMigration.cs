using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace GenomiX.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialMigration : Migration
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
                    Name = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false, comment: "User-defined name for this DNA model."),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true, comment: "Owner user (FK)."),
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
                name: "RoleRequests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RequestedRole = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    RequestType = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DecidedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DecidedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoleRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RoleRequests_AspNetUsers_DecidedByUserId",
                        column: x => x.DecidedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_RoleRequests_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

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
                    DNAModelId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, comment: "FK to DNAModel."),
                    DiseaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, comment: "FK to Disease.")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DNA_Models_Diseases", x => new { x.DNAModelId, x.DiseaseId });
                    table.ForeignKey(
                        name: "FK_DNA_Models_Diseases_DNA_Models_DNAModelId",
                        column: x => x.DNAModelId,
                        principalTable: "DNA_Models",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
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
                    Strand = table.Column<byte>(type: "tinyint", nullable: false, comment: "Strand index (1 = forward, 2 = complementary)."),
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
                name: "Populations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, comment: "Primary key (GUID)."),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false, comment: "Human-friendly name for the run."),
                    Factors = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false, comment: "JSON with simulation factors (temperature, sunExposure, diseasePressure, ...)."),
                    BaseModelId = table.Column<Guid>(type: "uniqueidentifier", nullable: true, comment: "Link to the base DNAModel used to derive this population."),
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
                    table.ForeignKey(
                        name: "FK_Populations_DNA_Models_BaseModelId",
                        column: x => x.BaseModelId,
                        principalTable: "DNA_Models",
                        principalColumn: "Id");
                },
                comment: "A population of organisms simulated under given environmental/selection factors.");

            migrationBuilder.CreateTable(
                name: "Organisms",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, comment: "Primary key (GUID)."),
                    SimpleName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false, comment: "Simple/UI name."),
                    Type = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, comment: "Organism type."),
                    ScientificName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false, comment: "Scientific-like identifier."),
                    DNA_Model_Id = table.Column<Guid>(type: "uniqueidentifier", nullable: true, comment: "FK to a DNA model snapshot (for this organism)."),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false, comment: "Optional description."),
                    PopulationId = table.Column<Guid>(type: "uniqueidentifier", nullable: true, comment: "FK to Population."),
                    SurvivalScore = table.Column<double>(type: "float", nullable: true, comment: "Continuous survival/fitness score (nullable)."),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false, comment: "Status: alive | dead | reproduced."),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, comment: "UTC created timestamp."),
                    X = table.Column<float>(type: "real", nullable: false, comment: "X coordinate property."),
                    Y = table.Column<float>(type: "real", nullable: false, comment: "Y coordinate property."),
                    Fitness = table.Column<double>(type: "float", nullable: false, comment: "Fitness property.")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Organisms", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Organisms_DNA_Models_DNA_Model_Id",
                        column: x => x.DNA_Model_Id,
                        principalTable: "DNA_Models",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Organisms_Populations_PopulationId",
                        column: x => x.PopulationId,
                        principalTable: "Populations",
                        principalColumn: "Id");
                });

            migrationBuilder.InsertData(
                table: "AspNetRoles",
                columns: new[] { "Id", "ConcurrencyStamp", "Name", "NormalizedName" },
                values: new object[,]
                {
                    { new Guid("6e6f2c2a-7c3f-4e7d-9f84-2b3a4d9d1001"), "a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "Admin", "ADMIN" },
                    { new Guid("6e6f2c2a-7c3f-4e7d-9f84-2b3a4d9d1002"), "b2222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "User", "USER" },
                    { new Guid("6e6f2c2a-7c3f-4e7d-9f84-2b3a4d9d1003"), "d3333333-dddd-dddd-dddd-dddddddddddd", "Scientist", "SCIENTIST" }
                });

            migrationBuilder.InsertData(
                table: "AspNetUsers",
                columns: new[] { "Id", "AccessFailedCount", "ConcurrencyStamp", "CreatedAt", "Email", "EmailConfirmed", "FirstName", "LastName", "LockoutEnabled", "LockoutEnd", "NormalizedEmail", "NormalizedUserName", "PasswordHash", "PhoneNumber", "PhoneNumberConfirmed", "SecurityStamp", "TwoFactorEnabled", "UserName" },
                values: new object[,]
                {
                    { new Guid("58a7c2b5-1347-4f0a-b3ad-912d4f098aaa"), 0, "33333333-3333-3333-3333-333333333333", new DateTime(2024, 8, 20, 8, 45, 0, 0, DateTimeKind.Utc), "ivan@example.com", false, "Ivan", "Petrov", false, null, "IVAN@EXAMPLE.COM", "IVAN", "AQAAAAIAAYagAAAAEIkC1sWbH1iX8tcz2c1oRzFYI0J0mxPOhUkYqGp16wHQi0NmbTQd1+TquU5EtdISew==", null, false, "ccccccc3-cccc-cccc-cccc-cccccccccccc", false, "ivan" },
                    { new Guid("9d5e0ac1-4f1b-422b-b7f0-0f7d5d2dbbb1"), 0, "22222222-2222-2222-2222-222222222222", new DateTime(2024, 7, 15, 10, 30, 0, 0, DateTimeKind.Utc), "alice@example.com", true, "Alice", "Johnson", false, null, "ALICE@EXAMPLE.COM", "ALICE", "AQAAAAIAAYagAAAAED7CaPCa5Oa3vAGoXw8QDdC2aURdW1KhO/yY4ZEnWJoKpRjNUNu4dF9YLeIHByOjLg==", null, false, "bbbbbbb2-bbbb-bbbb-bbbb-bbbbbbbbbbbb", false, "alice" },
                    { new Guid("c2b3d8ae-2b6d-4c41-9b8e-b1c2a3d4e005"), 0, "44444444-4444-4444-4444-4444444444444", new DateTime(2024, 9, 10, 11, 15, 0, 0, DateTimeKind.Utc), "georgi.scientist@example.com", true, "Georgi", "Kolev", false, null, "GEORGI.SCIENTIST@EXAMPLE.COM", "GEORGI.SCIENTIST", "AQAAAAIAAYagAAAAEL6H2uXl7u0qg7c+W6ZQ2gk0q0zv2Qm8q6pA6xvYQ2n2eK1m8s0n1l5r3j0h2p4c6w==", null, false, "ddddddd5-dddd-dddd-dddd-dddddddddddd", false, "georgi.scientist" },
                    { new Guid("ea821ce2-2a3d-43ef-8978-5f34ee07d080"), 0, "11111111-1111-1111-1111-111111111111", new DateTime(2024, 6, 1, 12, 0, 0, 0, DateTimeKind.Utc), "stilyan@example.com", true, "Stilyan", "Chanev", false, null, "STILYAN@EXAMPLE.COM", "STILYAN", "AQAAAAIAAYagAAAAEHzs4+DPBZG9xAgWTlZ7ezRrWg2DfpAjDKOrzJizgKN9PduBps+Ke0JrDB5QNi5u/A==", null, false, "aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaaa", false, "stilyan" }
                });

            migrationBuilder.InsertData(
                table: "Diseases",
                columns: new[] { "Id", "Description", "Name" },
                values: new object[,]
                {
                    { new Guid("11111111-1111-1111-1111-111111111111"), "Genetic disorder caused by a mutation in the HBB gene, leading to abnormal hemoglobin and sickle-shaped red blood cells.", "Sickle Cell Anemia" },
                    { new Guid("22222222-2222-2222-2222-222222222222"), "Caused by mutations in the CFTR gene, resulting in thick mucus affecting the lungs and digestive system.", "Cystic Fibrosis" },
                    { new Guid("33333333-3333-3333-3333-333333333333"), "Neurodegenerative disorder caused by expanded CAG repeats in the HTT gene.", "Huntington's Disease" },
                    { new Guid("44444444-4444-4444-4444-444444444444"), "Metabolic disorder due to mutations in the PAH gene, leading to inability to break down phenylalanine.", "Phenylketonuria (PKU)" },
                    { new Guid("55555555-5555-5555-5555-555555555555"), "Fatal genetic disorder caused by mutations in the HEXA gene, leading to accumulation of GM2 ganglioside in nerve cells.", "Tay-Sachs Disease" }
                });

            migrationBuilder.InsertData(
                table: "Reference_Sequences",
                columns: new[] { "Id", "CreatedAt", "Name", "Sequence", "Species" },
                values: new object[,]
                {
                    { new Guid("11111111-0000-0000-0000-000000000001"), new DateTimeOffset(new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "BRCA1 fragment", "ATGGAAGAGCTGTCAGGAGAGCTGCCAGCTGGTGAGGAAGCAGTGAGCCTGAGCAAGAGCTGAG", "Homo sapiens" },
                    { new Guid("11111111-0000-0000-0000-000000000002"), new DateTimeOffset(new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "BRCA1 fragment (complement)", "CTCAGCTCTTGCTCAGGCTCACTGCTTCCTCACCAGCTGGCAGCTCTCCTGACAGCTCTTCCAT", "Homo sapiens" },
                    { new Guid("22222222-0000-0000-0000-000000000001"), new DateTimeOffset(new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "TP53 fragment", "ATGGTCAGGACCTGGAGAAGGAGCTGAGGCTGGATGAAGTCAAGAGTGTCAAGCGAGCTGAGG", "Mus musculus" },
                    { new Guid("22222222-0000-0000-0000-000000000002"), new DateTimeOffset(new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "TP53 fragment (complement)", "CCTCAGCTCGCTTGACACTCTTGACTTCATCCAGCCTCAGCTCCTTCTCCAGGTCCTGACCAG", "Mus musculus" },
                    { new Guid("33333333-0000-0000-0000-000000000001"), new DateTimeOffset(new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "COX1 mitochondrial fragment", "ATGGAAGAGGAGCTGCTGAGGAGCTGGTGAGGAAGCAGTGAGCCTGAGCAAGAGCTGAGCTA", "Canis lupus familiaris" },
                    { new Guid("33333333-0000-0000-0000-000000000002"), new DateTimeOffset(new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "COX1 mitochondrial fragment (complement)", "TAGCTCAGCTCTTGCTCAGGCTCACTGCTTCCTCACCAGCTCCTCAGCAGCTCCTCTTCCAT", "Canis lupus familiaris" }
                });

            migrationBuilder.InsertData(
                table: "AspNetUserRoles",
                columns: new[] { "RoleId", "UserId" },
                values: new object[,]
                {
                    { new Guid("6e6f2c2a-7c3f-4e7d-9f84-2b3a4d9d1002"), new Guid("58a7c2b5-1347-4f0a-b3ad-912d4f098aaa") },
                    { new Guid("6e6f2c2a-7c3f-4e7d-9f84-2b3a4d9d1002"), new Guid("9d5e0ac1-4f1b-422b-b7f0-0f7d5d2dbbb1") },
                    { new Guid("6e6f2c2a-7c3f-4e7d-9f84-2b3a4d9d1003"), new Guid("c2b3d8ae-2b6d-4c41-9b8e-b1c2a3d4e005") },
                    { new Guid("6e6f2c2a-7c3f-4e7d-9f84-2b3a4d9d1001"), new Guid("ea821ce2-2a3d-43ef-8978-5f34ee07d080") }
                });

            migrationBuilder.InsertData(
                table: "DNA_Models",
                columns: new[] { "Id", "CreatedAt", "Name", "UpdatedAt", "UserId" },
                values: new object[,]
                {
                    { new Guid("44444444-0000-0000-0000-000000000001"), new DateTimeOffset(new DateTime(2024, 6, 15, 12, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Untitled model", new DateTimeOffset(new DateTime(2024, 6, 15, 12, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), new Guid("ea821ce2-2a3d-43ef-8978-5f34ee07d080") },
                    { new Guid("44444444-0000-0000-0000-000000000002"), new DateTimeOffset(new DateTime(2024, 7, 20, 9, 30, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Untitled model", new DateTimeOffset(new DateTime(2024, 7, 20, 9, 30, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), new Guid("9d5e0ac1-4f1b-422b-b7f0-0f7d5d2dbbb1") },
                    { new Guid("44444444-0000-0000-0000-000000000003"), new DateTimeOffset(new DateTime(2024, 8, 25, 10, 45, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Untitled model", new DateTimeOffset(new DateTime(2024, 8, 25, 10, 45, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), new Guid("58a7c2b5-1347-4f0a-b3ad-912d4f098aaa") },
                    { new Guid("44444444-0000-0000-0000-000000000005"), new DateTimeOffset(new DateTime(2024, 9, 10, 11, 20, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Untitled model", new DateTimeOffset(new DateTime(2024, 9, 10, 11, 20, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), new Guid("c2b3d8ae-2b6d-4c41-9b8e-b1c2a3d4e005") }
                });

            migrationBuilder.InsertData(
                table: "DNA_Model_Mutations",
                columns: new[] { "Id", "Alt", "CreatedAt", "ModelId", "PosEnd", "PosStart", "Ref", "Type" },
                values: new object[,]
                {
                    { new Guid("aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa"), "T", new DateTimeOffset(new DateTime(2024, 9, 1, 10, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), new Guid("44444444-0000-0000-0000-000000000001"), 6, 6, "A", "substitution" },
                    { new Guid("bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb"), "G", new DateTimeOffset(new DateTime(2024, 9, 1, 10, 10, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), new Guid("44444444-0000-0000-0000-000000000001"), 10, 10, "", "insertion" },
                    { new Guid("cccccccc-3333-3333-3333-cccccccccccc"), "", new DateTimeOffset(new DateTime(2024, 9, 1, 10, 20, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), new Guid("44444444-0000-0000-0000-000000000002"), 16, 15, "CT", "deletion" }
                });

            migrationBuilder.InsertData(
                table: "DNA_Models_Diseases",
                columns: new[] { "DNAModelId", "DiseaseId" },
                values: new object[,]
                {
                    { new Guid("44444444-0000-0000-0000-000000000001"), new Guid("11111111-1111-1111-1111-111111111111") },
                    { new Guid("44444444-0000-0000-0000-000000000001"), new Guid("22222222-2222-2222-2222-222222222222") },
                    { new Guid("44444444-0000-0000-0000-000000000002"), new Guid("33333333-3333-3333-3333-333333333333") }
                });

            migrationBuilder.InsertData(
                table: "DNA_Sequences",
                columns: new[] { "Id", "CreatedAt", "ModelId", "Sequence", "Strand" },
                values: new object[,]
                {
                    { new Guid("a1111111-1111-1111-1111-111111111111"), new DateTimeOffset(new DateTime(2024, 6, 1, 12, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), new Guid("44444444-0000-0000-0000-000000000001"), "ATGGTGCACCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGTGAGGCCCTGGGCAG", (byte)1 },
                    { new Guid("a2222222-2222-2222-2222-222222222222"), new DateTimeOffset(new DateTime(2024, 6, 1, 12, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), new Guid("44444444-0000-0000-0000-000000000001"), "TACACCACGTGGACTGAGACTCCTTTCAGACGGCAATGACGGGACACCCCGTTCCACTTGCACCTACTTCAACCACCACTCCGGGACCCGTC", (byte)1 },
                    { new Guid("b1111111-1111-1111-1111-111111111111"), new DateTimeOffset(new DateTime(2024, 7, 15, 10, 30, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), new Guid("44444444-0000-0000-0000-000000000002"), "ATGGATGCCATGGGACCTGAGGAAGGAGAAGGCCCTGGGCCCTGAGGACCTTGGCTACACAGGCTGTTGGTGGTGCTGAGGAGGCTGGCCAC", (byte)1 },
                    { new Guid("b2222222-2222-2222-2222-222222222222"), new DateTimeOffset(new DateTime(2024, 7, 15, 10, 30, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), new Guid("44444444-0000-0000-0000-000000000002"), "TACCTACGGTACCCTGGACTCCTTCCTCTTCCGGGACCCGGGACTCCTGGAACCGATGTGTCCGACAACCACCACGACTCCTCCGACCGGTG", (byte)1 },
                    { new Guid("c1111111-1111-1111-1111-111111111111"), new DateTimeOffset(new DateTime(2024, 8, 20, 8, 45, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), new Guid("44444444-0000-0000-0000-000000000003"), "ATGCCAGGAGCTGCTGGAGGAGGTGCTGGAGGCTGGAGGCGTTCCTGGGCTGAGTGGCTGGAGGAGGAGGAGCAGGAGGCTGGCTGCTGGAG", (byte)1 },
                    { new Guid("c2222222-2222-2222-2222-222222222222"), new DateTimeOffset(new DateTime(2024, 8, 20, 8, 45, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), new Guid("44444444-0000-0000-0000-000000000003"), "TACGGTCC TCGACGACCTCCTCCACGACCTCCGACCTCCGCAAGGACCCGACTCACCGACCTCCTCCTCGTCCTCCGACCGACGACCTC", (byte)1 }
                });

            migrationBuilder.InsertData(
                table: "Populations",
                columns: new[] { "Id", "BaseModelId", "CreatedAt", "Factors", "Name", "UserId" },
                values: new object[,]
                {
                    { new Guid("11111111-1111-1111-1111-111111111111"), new Guid("44444444-0000-0000-0000-000000000001"), new DateTimeOffset(new DateTime(2024, 6, 1, 12, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "{ \"temperature\": 22, \"sunExposure\": \"medium\", \"diseasePressure\": 0.3 }", "Human Urban Population", new Guid("ea821ce2-2a3d-43ef-8978-5f34ee07d080") },
                    { new Guid("22222222-2222-2222-2222-222222222222"), new Guid("44444444-0000-0000-0000-000000000002"), new DateTimeOffset(new DateTime(2024, 7, 15, 10, 30, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "{ \"temperature\": 25, \"sunExposure\": \"low\", \"diseasePressure\": 0.1 }", "Mouse Lab Population", new Guid("9d5e0ac1-4f1b-422b-b7f0-0f7d5d2dbbb1") },
                    { new Guid("33333333-3333-3333-3333-333333333333"), new Guid("44444444-0000-0000-0000-000000000003"), new DateTimeOffset(new DateTime(2024, 8, 20, 8, 45, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "{ \"temperature\": 28, \"sunExposure\": \"high\", \"diseasePressure\": 0.5 }", "Dog Wild Pack", new Guid("58a7c2b5-1347-4f0a-b3ad-912d4f098aaa") }
                });

            migrationBuilder.InsertData(
                table: "Organisms",
                columns: new[] { "Id", "CreatedAt", "DNA_Model_Id", "Description", "Fitness", "PopulationId", "ScientificName", "SimpleName", "Status", "SurvivalScore", "Type", "X", "Y" },
                values: new object[,]
                {
                    { new Guid("44444444-4444-4444-4444-444444444444"), new DateTimeOffset(new DateTime(2024, 6, 1, 12, 5, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), new Guid("44444444-0000-0000-0000-000000000001"), "A simulated human organism from urban population.", 0.0, new Guid("11111111-1111-1111-1111-111111111111"), "Homo sapiens A", "Human A", "alive", 0.84999999999999998, "", 0f, 0f },
                    { new Guid("55555555-5555-5555-5555-555555555555"), new DateTimeOffset(new DateTime(2024, 7, 15, 10, 35, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), new Guid("44444444-0000-0000-0000-000000000002"), "Lab mouse adapted to controlled temperature and low disease pressure.", 0.0, new Guid("22222222-2222-2222-2222-222222222222"), "Mus musculus L1", "Lab Mouse 1", "alive", 0.92000000000000004, "", 0f, 0f },
                    { new Guid("66666666-6666-6666-6666-666666666666"), new DateTimeOffset(new DateTime(2024, 8, 20, 8, 50, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), new Guid("44444444-0000-0000-0000-000000000003"), "Leader of the wild dog pack, facing high disease pressure.", 0.0, new Guid("33333333-3333-3333-3333-333333333333"), "Canis lupus familiaris Alpha", "Dog Alpha", "alive", 0.65000000000000002, "", 0f, 0f }
                });

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
                name: "IX_DNA_Sequences_ModelId",
                table: "DNA_Sequences",
                column: "ModelId");

            migrationBuilder.CreateIndex(
                name: "IX_Organisms_DNA_Model_Id",
                table: "Organisms",
                column: "DNA_Model_Id");

            migrationBuilder.CreateIndex(
                name: "IX_Organisms_PopulationId",
                table: "Organisms",
                column: "PopulationId");

            migrationBuilder.CreateIndex(
                name: "IX_Populations_BaseModelId",
                table: "Populations",
                column: "BaseModelId");

            migrationBuilder.CreateIndex(
                name: "IX_Populations_UserId",
                table: "Populations",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_RoleRequests_DecidedByUserId",
                table: "RoleRequests",
                column: "DecidedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_RoleRequests_UserId",
                table: "RoleRequests",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
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
                name: "DNA_Sequences");

            migrationBuilder.DropTable(
                name: "Organisms");

            migrationBuilder.DropTable(
                name: "Reference_Sequences");

            migrationBuilder.DropTable(
                name: "RoleRequests");

            migrationBuilder.DropTable(
                name: "AspNetRoles");

            migrationBuilder.DropTable(
                name: "Diseases");

            migrationBuilder.DropTable(
                name: "Populations");

            migrationBuilder.DropTable(
                name: "DNA_Models");

            migrationBuilder.DropTable(
                name: "AspNetUsers");
        }
    }
}
