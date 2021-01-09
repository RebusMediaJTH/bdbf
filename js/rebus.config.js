var rebus = rebus || {};

/*
    pages - page:
        path: String - a path relative to the current page; e.g. 'p1', '../p1' (go back), '/p2' (go to root)
        title: String
        hideHeader: Boolean
        hideHeaderTitle: Boolean
        redirectIfTopicComplete: String - a path, relative to the original page, to redirect to if the topic is complete
                                          e.g. a module assessment may redirect to the module completion page
        markCourseAsComplete: Boolean - Put on completion page of the last module if "takeModulesInOrder: true";
                                        otherwise the course will be set as complete when all modules are complete
*/
rebus.config = {
  title: 'Better Decisions for a Better Future - Retail', // Used my progress modal
  id: 'bdbf_m1', // Used for generating a unique cookie for local testing
  useLMS: false,
  debug: true,
  debugTypes: '*',
  takeModulesInOrder: false,
  takeTopicsInOrder: false,
  takePagesInOrder: true,
  includeProgressModal: false,
  videosMustBePlayedThrough: false,
  audioMustBePlayedThrough: true,
  useDefaultPDFViewerForBrowser: false,
  mozillaPDFViewerLinks: 'disabled', // 'disabled' | 'open-new-window'. If not set, they will be active and open in the current window.
  pages: [
      {
          type: 'modules',
          modules: [
              {
                  folder: 'm1',
                  title: 'Better Decisions for a Better Future - Retail. Part 1.',
                  pages: [
                      { path: 'menu', title: 'Menu', type: 'menu', hideHeader: true },
                      {
                          type: 'topics',
                          topics: [
                              {
                                  folder: 't1',
                                  title: 'Diversity and Inclusion',
                                  pages: [
                                      { path: 'p1', title: 'Diversity and Inclusion' }
                                  ]
                              },
                              {
                                  folder: 't2',
                                  title: 'Work Health and Safety',
                                  pages: [
                                      { path: 'p1', title: 'Work Health and Safety' }
                                  ]
                              },
                              {
                                  folder: 't3',
                                  title: 'Online Safety',
                                  pages: [
                                      { path: 'p1', title: 'Online Safety' }
                                  ]
                              },
                              {
                                folder: 't4',
                                title: 'Social Media',
                                pages: [
                                    { path: 'p1', title: 'Social Media' }
                                ]
                            },
                            {
                                folder: 't5',
                                title: 'Harassment, Discrimination and Bullying',
                                pages: [
                                    { path: 'p1', title: 'Harassment, Discrimination and Bullying' }
                                ]
                            }
                          ]
                      },
                      { path: 'completion', title: 'One last thing', type: 'completion' }
                  ]
              }
          ]
      }
  ]
};