# Gauzy Teams Extensions

Gauzy Teams Extension using Plasmo Framework for building Chrome extensions. Check documentation here https://docs.plasmo.com/. Use pNpM as package manager https://pnpm.io/ as per documentation recommendations.

Main Points for project continuation:
- Fix bug: Currently adding a new task doesn't get saved in state and there is a bug with saving the time for it
- Remove all state from service worker and move into local storage (related to bug in #1)
- UI/UX improvements/redesign
- All tasks and active task field should probably be connected together because there is a duplicate of fields currently when a task is selected from existing tasks
- Ability to change estimated for a task and Save it 
- A clear button ("X") next to active task to clear input
- New view when "Check team" is clicked to see list of team members and details for their work with statuses
