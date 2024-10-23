export const commandsTemplate = `
    <div class="commands-container">
        <div class="commands-header">
            <div class="commands-search">
                <input type="text" placeholder="Search commands..." id="command-search">
            </div>
            <div class="commands-actions">
                <button id="import-commands" class="btn">Import Commands</button>
                <button id="export-commands" class="btn">Export Commands</button>
                <button id="reload-commands" class="btn">Reload Commands</button>
            </div>
        </div>
        <div class="commands-selection-bar">
            <div class="selection-info">
                <span id="selection-count">0</span> commands selected
            </div>
            <div class="selection-actions">
                <button id="select-all" class="btn">Select All</button>
                <button id="deselect-all" class="btn">Deselect All</button>
                <button id="export-selected" class="btn">Export Selected</button>
            </div>
        </div>
        <div id="commands-list" class="commands-list">
            <div class="commands-loading">
                <div class="loading-spinner"></div>
            </div>
        </div>
    </div>

    <!-- Import Modal -->
    <div class="modal" id="import-modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">Import Commands</h2>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <input type="file" id="import-file" accept=".js,.json" style="display: none">
                <button id="choose-file" class="btn">Choose File</button>
                <p id="selected-file"></p>
                <div id="import-command-list" class="command-list-modal">
                    <!-- Commands to import will be listed here -->
                </div>
            </div>
            <div class="modal-footer">
                <button id="cancel-import" class="btn">Cancel</button>
                <button id="confirm-import" class="btn primary">Import Selected</button>
            </div>
        </div>
    </div>

    <!-- Export Modal -->
    <div class="modal" id="export-modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">Export Commands</h2>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="export-options">
                    <label>
                        <input type="radio" name="export-type" value="js" checked>
                        JavaScript (.js)
                    </label>
                    <label>
                        <input type="radio" name="export-type" value="json">
                        JSON (.json)
                    </label>
                </div>
                <div id="export-command-list" class="command-list-modal">
                    <!-- Commands to export will be listed here -->
                </div>
            </div>
            <div class="modal-footer">
                <button id="cancel-export" class="btn">Cancel</button>
                <button id="confirm-export" class="btn primary">Export Selected</button>
            </div>
        </div>
    </div>
`;
