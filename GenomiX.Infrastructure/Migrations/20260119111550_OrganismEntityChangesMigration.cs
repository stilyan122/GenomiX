using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GenomiX.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class OrganismEntityChangesMigration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "Fitness",
                table: "Organisms",
                type: "float",
                nullable: false,
                defaultValue: 0.0,
                comment: "Fitness property.");

            migrationBuilder.AddColumn<float>(
                name: "X",
                table: "Organisms",
                type: "real",
                nullable: false,
                defaultValue: 0f,
                comment: "X coordinate property.");

            migrationBuilder.AddColumn<float>(
                name: "Y",
                table: "Organisms",
                type: "real",
                nullable: false,
                defaultValue: 0f,
                comment: "Y coordinate property.");

            migrationBuilder.UpdateData(
                table: "Organisms",
                keyColumn: "Id",
                keyValue: new Guid("44444444-4444-4444-4444-444444444444"),
                columns: new[] { "DNA_Model_Id", "Fitness", "X", "Y" },
                values: new object[] { new Guid("44444444-0000-0000-0000-000000000001"), 0.0, 0f, 0f });

            migrationBuilder.UpdateData(
                table: "Organisms",
                keyColumn: "Id",
                keyValue: new Guid("55555555-5555-5555-5555-555555555555"),
                columns: new[] { "DNA_Model_Id", "Fitness", "X", "Y" },
                values: new object[] { new Guid("44444444-0000-0000-0000-000000000002"), 0.0, 0f, 0f });

            migrationBuilder.UpdateData(
                table: "Organisms",
                keyColumn: "Id",
                keyValue: new Guid("66666666-6666-6666-6666-666666666666"),
                columns: new[] { "DNA_Model_Id", "Fitness", "X", "Y" },
                values: new object[] { new Guid("44444444-0000-0000-0000-000000000003"), 0.0, 0f, 0f });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Fitness",
                table: "Organisms");

            migrationBuilder.DropColumn(
                name: "X",
                table: "Organisms");

            migrationBuilder.DropColumn(
                name: "Y",
                table: "Organisms");

            migrationBuilder.UpdateData(
                table: "Organisms",
                keyColumn: "Id",
                keyValue: new Guid("44444444-4444-4444-4444-444444444444"),
                column: "DNA_Model_Id",
                value: null);

            migrationBuilder.UpdateData(
                table: "Organisms",
                keyColumn: "Id",
                keyValue: new Guid("55555555-5555-5555-5555-555555555555"),
                column: "DNA_Model_Id",
                value: null);

            migrationBuilder.UpdateData(
                table: "Organisms",
                keyColumn: "Id",
                keyValue: new Guid("66666666-6666-6666-6666-666666666666"),
                column: "DNA_Model_Id",
                value: null);
        }
    }
}
