using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GenomiX.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class DNASequenceEntitySlightChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PairIndex",
                table: "Reference_Sequences");

            migrationBuilder.DropColumn(
                name: "Strand",
                table: "Reference_Sequences");

            migrationBuilder.DropColumn(
                name: "CurrentIndex",
                table: "DNA_Models");

            migrationBuilder.DropColumn(
                name: "DisplayMode",
                table: "DNA_Models");

            migrationBuilder.AddColumn<byte>(
                name: "Strand",
                table: "DNA_Sequences",
                type: "tinyint",
                nullable: false,
                defaultValue: (byte)0,
                comment: "Strand index (1 = forward, 2 = complementary).");

            migrationBuilder.UpdateData(
                table: "DNA_Sequences",
                keyColumn: "Id",
                keyValue: new Guid("a1111111-1111-1111-1111-111111111111"),
                column: "Strand",
                value: (byte)1);

            migrationBuilder.UpdateData(
                table: "DNA_Sequences",
                keyColumn: "Id",
                keyValue: new Guid("a2222222-2222-2222-2222-222222222222"),
                column: "Strand",
                value: (byte)1);

            migrationBuilder.UpdateData(
                table: "DNA_Sequences",
                keyColumn: "Id",
                keyValue: new Guid("b1111111-1111-1111-1111-111111111111"),
                column: "Strand",
                value: (byte)1);

            migrationBuilder.UpdateData(
                table: "DNA_Sequences",
                keyColumn: "Id",
                keyValue: new Guid("b2222222-2222-2222-2222-222222222222"),
                column: "Strand",
                value: (byte)1);

            migrationBuilder.UpdateData(
                table: "DNA_Sequences",
                keyColumn: "Id",
                keyValue: new Guid("c1111111-1111-1111-1111-111111111111"),
                column: "Strand",
                value: (byte)1);

            migrationBuilder.UpdateData(
                table: "DNA_Sequences",
                keyColumn: "Id",
                keyValue: new Guid("c2222222-2222-2222-2222-222222222222"),
                column: "Strand",
                value: (byte)1);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Strand",
                table: "DNA_Sequences");

            migrationBuilder.AddColumn<int>(
                name: "PairIndex",
                table: "Reference_Sequences",
                type: "int",
                nullable: false,
                defaultValue: 0,
                comment: "Pair index groups complementary strands together (e.g., 0 = initial pair).");

            migrationBuilder.AddColumn<byte>(
                name: "Strand",
                table: "Reference_Sequences",
                type: "tinyint",
                nullable: false,
                defaultValue: (byte)0,
                comment: "Strand index of the reference sequence (1 = forward, 2 = complementary).");

            migrationBuilder.AddColumn<int>(
                name: "CurrentIndex",
                table: "DNA_Models",
                type: "int",
                nullable: false,
                defaultValue: 0,
                comment: "Active timeline index (zero-based).");

            migrationBuilder.AddColumn<byte>(
                name: "DisplayMode",
                table: "DNA_Models",
                type: "tinyint",
                nullable: false,
                defaultValue: (byte)0,
                comment: "0 = Basic shapes, 1 = Scientific atomic view.");

            migrationBuilder.UpdateData(
                table: "DNA_Models",
                keyColumn: "Id",
                keyValue: new Guid("44444444-0000-0000-0000-000000000001"),
                columns: new[] { "CurrentIndex", "DisplayMode" },
                values: new object[] { 0, (byte)1 });

            migrationBuilder.UpdateData(
                table: "DNA_Models",
                keyColumn: "Id",
                keyValue: new Guid("44444444-0000-0000-0000-000000000002"),
                columns: new[] { "CurrentIndex", "DisplayMode" },
                values: new object[] { 0, (byte)0 });

            migrationBuilder.UpdateData(
                table: "DNA_Models",
                keyColumn: "Id",
                keyValue: new Guid("44444444-0000-0000-0000-000000000003"),
                columns: new[] { "CurrentIndex", "DisplayMode" },
                values: new object[] { 0, (byte)1 });

            migrationBuilder.UpdateData(
                table: "DNA_Models",
                keyColumn: "Id",
                keyValue: new Guid("44444444-0000-0000-0000-000000000004"),
                columns: new[] { "CurrentIndex", "DisplayMode" },
                values: new object[] { 0, (byte)1 });

            migrationBuilder.UpdateData(
                table: "DNA_Models",
                keyColumn: "Id",
                keyValue: new Guid("44444444-0000-0000-0000-000000000005"),
                columns: new[] { "CurrentIndex", "DisplayMode" },
                values: new object[] { 0, (byte)1 });

            migrationBuilder.UpdateData(
                table: "Reference_Sequences",
                keyColumn: "Id",
                keyValue: new Guid("11111111-0000-0000-0000-000000000001"),
                columns: new[] { "PairIndex", "Strand" },
                values: new object[] { 0, (byte)1 });

            migrationBuilder.UpdateData(
                table: "Reference_Sequences",
                keyColumn: "Id",
                keyValue: new Guid("11111111-0000-0000-0000-000000000002"),
                columns: new[] { "PairIndex", "Strand" },
                values: new object[] { 0, (byte)2 });

            migrationBuilder.UpdateData(
                table: "Reference_Sequences",
                keyColumn: "Id",
                keyValue: new Guid("22222222-0000-0000-0000-000000000001"),
                columns: new[] { "PairIndex", "Strand" },
                values: new object[] { 1, (byte)1 });

            migrationBuilder.UpdateData(
                table: "Reference_Sequences",
                keyColumn: "Id",
                keyValue: new Guid("22222222-0000-0000-0000-000000000002"),
                columns: new[] { "PairIndex", "Strand" },
                values: new object[] { 1, (byte)2 });

            migrationBuilder.UpdateData(
                table: "Reference_Sequences",
                keyColumn: "Id",
                keyValue: new Guid("33333333-0000-0000-0000-000000000001"),
                columns: new[] { "PairIndex", "Strand" },
                values: new object[] { 2, (byte)1 });

            migrationBuilder.UpdateData(
                table: "Reference_Sequences",
                keyColumn: "Id",
                keyValue: new Guid("33333333-0000-0000-0000-000000000002"),
                columns: new[] { "PairIndex", "Strand" },
                values: new object[] { 2, (byte)2 });
        }
    }
}
