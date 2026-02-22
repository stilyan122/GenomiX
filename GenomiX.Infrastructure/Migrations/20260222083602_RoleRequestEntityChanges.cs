using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GenomiX.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RoleRequestEntityChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CancelledAt",
                table: "RoleRequests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DecisionNote",
                table: "RoleRequests",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DedupeKey",
                table: "RoleRequests",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "RoleRequests",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CancelledAt",
                table: "RoleRequests");

            migrationBuilder.DropColumn(
                name: "DecisionNote",
                table: "RoleRequests");

            migrationBuilder.DropColumn(
                name: "DedupeKey",
                table: "RoleRequests");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "RoleRequests");
        }
    }
}
