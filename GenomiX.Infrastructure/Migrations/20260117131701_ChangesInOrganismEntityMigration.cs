using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GenomiX.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ChangesInOrganismEntityMigration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Organisms_DNA_Sequences_DNA_Sequence_Id",
                table: "Organisms");

            migrationBuilder.DropIndex(
                name: "IX_Organisms_DNA_Sequence_Id",
                table: "Organisms");

            migrationBuilder.DropColumn(
                name: "DNA_Sequence_Id",
                table: "Organisms");

            migrationBuilder.AddColumn<Guid>(
                name: "DNA_Model_Id",
                table: "Organisms",
                type: "uniqueidentifier",
                nullable: true,
                comment: "FK to a DNA model snapshot (for this organism).");

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

            migrationBuilder.CreateIndex(
                name: "IX_Organisms_DNA_Model_Id",
                table: "Organisms",
                column: "DNA_Model_Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Organisms_DNA_Models_DNA_Model_Id",
                table: "Organisms",
                column: "DNA_Model_Id",
                principalTable: "DNA_Models",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Organisms_DNA_Models_DNA_Model_Id",
                table: "Organisms");

            migrationBuilder.DropIndex(
                name: "IX_Organisms_DNA_Model_Id",
                table: "Organisms");

            migrationBuilder.DropColumn(
                name: "DNA_Model_Id",
                table: "Organisms");

            migrationBuilder.AddColumn<Guid>(
                name: "DNA_Sequence_Id",
                table: "Organisms",
                type: "uniqueidentifier",
                nullable: true,
                comment: "FK to a DNA strand snapshot (for this organism).");

            migrationBuilder.UpdateData(
                table: "Organisms",
                keyColumn: "Id",
                keyValue: new Guid("44444444-4444-4444-4444-444444444444"),
                column: "DNA_Sequence_Id",
                value: new Guid("a1111111-1111-1111-1111-111111111111"));

            migrationBuilder.UpdateData(
                table: "Organisms",
                keyColumn: "Id",
                keyValue: new Guid("55555555-5555-5555-5555-555555555555"),
                column: "DNA_Sequence_Id",
                value: new Guid("a2222222-2222-2222-2222-222222222222"));

            migrationBuilder.UpdateData(
                table: "Organisms",
                keyColumn: "Id",
                keyValue: new Guid("66666666-6666-6666-6666-666666666666"),
                column: "DNA_Sequence_Id",
                value: new Guid("b1111111-1111-1111-1111-111111111111"));

            migrationBuilder.CreateIndex(
                name: "IX_Organisms_DNA_Sequence_Id",
                table: "Organisms",
                column: "DNA_Sequence_Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Organisms_DNA_Sequences_DNA_Sequence_Id",
                table: "Organisms",
                column: "DNA_Sequence_Id",
                principalTable: "DNA_Sequences",
                principalColumn: "Id");
        }
    }
}
