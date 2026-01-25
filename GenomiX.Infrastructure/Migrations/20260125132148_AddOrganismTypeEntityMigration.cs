using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GenomiX.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddOrganismTypeEntityMigration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Type",
                table: "Organisms",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "",
                comment: "Organism type.");

            migrationBuilder.UpdateData(
                table: "Organisms",
                keyColumn: "Id",
                keyValue: new Guid("44444444-4444-4444-4444-444444444444"),
                column: "Type",
                value: "");

            migrationBuilder.UpdateData(
                table: "Organisms",
                keyColumn: "Id",
                keyValue: new Guid("55555555-5555-5555-5555-555555555555"),
                column: "Type",
                value: "");

            migrationBuilder.UpdateData(
                table: "Organisms",
                keyColumn: "Id",
                keyValue: new Guid("66666666-6666-6666-6666-666666666666"),
                column: "Type",
                value: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Type",
                table: "Organisms");
        }
    }
}
