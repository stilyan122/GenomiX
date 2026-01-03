using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GenomiX.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class NewPropertyModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "DNA_Models",
                type: "nvarchar(80)",
                maxLength: 80,
                nullable: false,
                defaultValue: "",
                comment: "User-defined name for this DNA model.");

            migrationBuilder.UpdateData(
                table: "DNA_Models",
                keyColumn: "Id",
                keyValue: new Guid("44444444-0000-0000-0000-000000000001"),
                column: "Name",
                value: "Untitled model");

            migrationBuilder.UpdateData(
                table: "DNA_Models",
                keyColumn: "Id",
                keyValue: new Guid("44444444-0000-0000-0000-000000000002"),
                column: "Name",
                value: "Untitled model");

            migrationBuilder.UpdateData(
                table: "DNA_Models",
                keyColumn: "Id",
                keyValue: new Guid("44444444-0000-0000-0000-000000000003"),
                column: "Name",
                value: "Untitled model");

            migrationBuilder.UpdateData(
                table: "DNA_Models",
                keyColumn: "Id",
                keyValue: new Guid("44444444-0000-0000-0000-000000000004"),
                column: "Name",
                value: "Untitled model");

            migrationBuilder.UpdateData(
                table: "DNA_Models",
                keyColumn: "Id",
                keyValue: new Guid("44444444-0000-0000-0000-000000000005"),
                column: "Name",
                value: "Untitled model");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Name",
                table: "DNA_Models");
        }
    }
}
