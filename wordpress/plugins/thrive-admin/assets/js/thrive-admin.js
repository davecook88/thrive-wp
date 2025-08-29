/**
 * NodeJS Bridge Admin JavaScript
 */

jQuery(document).ready(function ($) {
  "use strict";

  // Handle view user action
  $(".view-user").on("click", function (e) {
    e.preventDefault();

    var userId = $(this).data("user-id");
    var $row = $(this).closest("tr");

    // Simple alert for now - can be expanded to show modal with user details
    alert(
      "View user details for User ID: " +
        userId +
        "\n\nThis feature can be expanded to show a modal with detailed user information."
    );
  });

  // Add loading state to filter form
  $(".users-filter-form").on("submit", function () {
    var $submitBtn = $(this).find('input[type="submit"]');
    var originalText = $submitBtn.val();

    $submitBtn.val("Filtering...").prop("disabled", true);

    // Re-enable after a short delay (in case of client-side validation)
    setTimeout(function () {
      $submitBtn.val(originalText).prop("disabled", false);
    }, 1000);
  });

  // Auto-submit search on enter (optional enhancement)
  $('.users-filter-form input[name="search"]').on("keypress", function (e) {
    if (e.which === 13) {
      // Enter key
      $(this).closest("form").submit();
    }
  });

  // Test API connection
  $("#thrive-admin-test-api").on("click", function (e) {
    e.preventDefault();

    var $button = $(this);
    var originalText = $button.text();

    // Show loading state
    $button.text("Testing...").prop("disabled", true);

    // Make AJAX call to test API connection
    $.ajax({
      url: thriveAdminBridgeAjax.ajax_url,
      type: "POST",
      data: {
        action: "thrive_admin_test_api_connection",
        nonce: thriveAdminBridgeAjax.nonce,
      },
      success: function (response) {
        if (response.success) {
          alert("✅ API Connection Successful!\n\n" + response.data.message);
        } else {
          alert("❌ API Connection Failed!\n\n" + response.data.message);
        }
      },
      error: function (xhr, status, error) {
        alert(
          "❌ Connection Error!\n\nUnable to reach the server. Please check your network connection."
        );
      },
      complete: function () {
        // Restore button state
        $button.text(originalText).prop("disabled", false);
      },
    });
  });
});
